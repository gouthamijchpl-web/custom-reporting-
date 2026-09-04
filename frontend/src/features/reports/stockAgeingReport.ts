import { normalizeReportingProduct } from '@/features/uploads/inventoryImport';
import type { NormalizedInventoryRecord } from '@/features/uploads/inventoryImport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';

export type StockAgeingBucketKey = 'lessThan30' | 'days30To60' | 'days60To90'
  | 'days90To120' | 'days120To180' | 'moreThan180';

export interface StockAgeingRow {
  skuNumber: string;
  itemDescription: string;
  style: string;
  productType: string;
  lessThan30: number;
  days30To60: number;
  days60To90: number;
  days90To120: number;
  days120To180: number;
  moreThan180: number;
  hasDataWarning: boolean;
  warningText: string;
}

export type StockAgeingTotals = Pick<StockAgeingRow, StockAgeingBucketKey> & {
  totalStock: number;
};

export interface StockAgeingResult {
  asOnDate: string;
  rows: StockAgeingRow[];
  totals: StockAgeingTotals;
  negativeStockSkuCount: number;
  negativeStockQuantity: number;
  unagedReturnSkuCount: number;
  unagedReturnQuantity: number;
  unknownOpeningStockSkuCount: number;
  unknownOpeningStockQuantity: number;
  unmappedProductCount: number;
  unmappedStyleCount: number;
  reconciliationDifference: number;
}

interface PurchaseLot {
  date: string;
  order: string;
  skuNumber: string;
  itemDescription: string;
  style: string;
  productType: string;
  remainingQuantity: number;
}

interface SkuState {
  lots: PurchaseLot[];
  purchaseReduction: number;
  salesQuantity: number;
  openingDate: string | null;
  openingQuantity: number;
}

const DAY_MS = 86_400_000;
const reportCache = new WeakMap<DailySalesCategorySource, Map<string, StockAgeingResult>>();
const BUCKET_KEYS: readonly StockAgeingBucketKey[] = [
  'lessThan30',
  'days30To60',
  'days60To90',
  'days90To120',
  'days120To180',
  'moreThan180',
];

function normalizedText(value: string | null | undefined, fallback: string): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase() || fallback;
}

/** Stock No/Stock Number is normalized to itemCode by Data Upload. */
export function stockAgeingSku(row: NormalizedInventoryRecord): string | null {
  const identifier = row.itemCode || row.skuCode || row.articleCode;
  return identifier ? identifier.trim().toLocaleUpperCase() : null;
}

function styleFor(row: NormalizedInventoryRecord): string {
  return normalizedText(row.style, 'UNMAPPED STYLE');
}

function productFor(row: NormalizedInventoryRecord): string {
  return normalizeReportingProduct(row.finalProductType) || 'UNMAPPED PRODUCT';
}

function descriptionFor(row: NormalizedInventoryRecord): string {
  return String(row.description ?? '').trim().replace(/\s+/g, ' ') || 'UNMAPPED ITEM DESCRIPTION';
}

function scopedSkuKey(row: NormalizedInventoryRecord, skuNumber: string): string {
  return [row.entityId, row.branchId ?? '', skuNumber].join('\u0000');
}

function emptyBuckets(): Pick<StockAgeingRow, StockAgeingBucketKey> {
  return {
    lessThan30: 0,
    days30To60: 0,
    days60To90: 0,
    days90To120: 0,
    days120To180: 0,
    moreThan180: 0,
  };
}

function emptyTotals(): StockAgeingTotals {
  return { ...emptyBuckets(), totalStock: 0 };
}

export function stockAgeingBucketForDays(ageDays: number): StockAgeingBucketKey {
  if (ageDays < 30) return 'lessThan30';
  if (ageDays < 60) return 'days30To60';
  if (ageDays < 90) return 'days60To90';
  if (ageDays < 120) return 'days90To120';
  if (ageDays <= 180) return 'days120To180';
  return 'moreThan180';
}

function ageInDays(asOnDate: string, purchaseDate: string): number {
  const asOnTime = Date.parse(`${asOnDate}T00:00:00Z`);
  const purchaseTime = Date.parse(`${purchaseDate}T00:00:00Z`);
  return Math.floor((asOnTime - purchaseTime) / DAY_MS);
}

function transactionOrder(row: NormalizedInventoryRecord): string {
  return [row.invoiceDate, row.invoiceNumber, row.lineNumber.padStart(12, '0'), row.transactionKey].join('|');
}

function getState(
  states: Map<string, SkuState>,
  row: NormalizedInventoryRecord,
  skuNumber: string,
): SkuState {
  const key = scopedSkuKey(row, skuNumber);
  const current = states.get(key);
  if (current) return current;
  const created: SkuState = {
    lots: [],
    purchaseReduction: 0,
    salesQuantity: 0,
    openingDate: null,
    openingQuantity: 0,
  };
  states.set(key, created);
  return created;
}

function addStockMovement(
  states: Map<string, SkuState>,
  row: NormalizedInventoryRecord,
  asOnDate: string,
): void {
  if (!row.invoiceDate || row.invoiceDate > asOnDate || row.quantity == null || row.quantity === 0) return;
  const skuNumber = stockAgeingSku(row);
  if (!skuNumber) return;
  const state = getState(states, row, skuNumber);
  if (state.openingDate && row.invoiceDate < state.openingDate) return;
  if (row.transactionType === 'sales') {
    state.salesQuantity += row.quantity;
    return;
  }
  if (row.quantity < 0) {
    state.purchaseReduction += Math.abs(row.quantity);
    return;
  }
  state.lots.push({
    date: row.invoiceDate,
    order: transactionOrder(row),
    skuNumber,
    itemDescription: descriptionFor(row),
    style: styleFor(row),
    productType: productFor(row),
    remainingQuantity: row.quantity,
  });
}

function addOpeningBaseline(
  states: Map<string, SkuState>,
  row: NormalizedInventoryRecord,
  asOnDate: string,
): void {
  if (!row.invoiceDate || row.invoiceDate > asOnDate || row.quantity == null || row.quantity === 0) return;
  const skuNumber = stockAgeingSku(row);
  if (!skuNumber) return;
  const state = getState(states, row, skuNumber);
  if (!state.openingDate || row.invoiceDate > state.openingDate) {
    state.openingDate = row.invoiceDate;
    state.openingQuantity = row.quantity;
  } else if (row.invoiceDate === state.openingDate) state.openingQuantity += row.quantity;
}

export function summarizeStockAgeingRows(rows: readonly StockAgeingRow[]): StockAgeingTotals {
  const totals = emptyTotals();
  for (const row of rows) {
    for (const key of BUCKET_KEYS) totals[key] += row[key];
  }
  totals.totalStock = BUCKET_KEYS.reduce((total, key) => total + totals[key], 0);
  return totals;
}

export function calculateStockAgeingReport(
  source: DailySalesCategorySource,
  asOnDate: string,
): StockAgeingResult {
  const states = new Map<string, SkuState>();
  for (const opening of source.openingStock ?? []) addOpeningBaseline(states, opening, asOnDate);
  for (const purchase of source.purchases) addStockMovement(states, purchase, asOnDate);
  for (const sale of source.sales) addStockMovement(states, sale, asOnDate);

  const groupedRows = new Map<string, StockAgeingRow>();
  let negativeStockSkuCount = 0;
  let negativeStockQuantity = 0;
  let unagedReturnSkuCount = 0;
  let unagedReturnQuantity = 0;
  let unknownOpeningStockSkuCount = 0;
  let unknownOpeningStockQuantity = 0;
  let identifiableRemainingQuantity = 0;

  for (const state of states.values()) {
    state.lots.sort((left, right) => left.order.localeCompare(right.order));
    let quantityToConsume = state.purchaseReduction + state.salesQuantity + Math.max(0, -state.openingQuantity);
    let unagedQuantity = 0;
    if (quantityToConsume < 0) {
      unagedQuantity = Math.abs(quantityToConsume);
      quantityToConsume = 0;
      unagedReturnSkuCount += 1;
      unagedReturnQuantity += unagedQuantity;
    }
    let unknownOpeningRemaining = Math.max(0, state.openingQuantity);
    if (quantityToConsume > 0 && unknownOpeningRemaining > 0) {
      const consumed = Math.min(unknownOpeningRemaining, quantityToConsume);
      unknownOpeningRemaining -= consumed;
      quantityToConsume -= consumed;
    }
    for (const lot of state.lots) {
      if (quantityToConsume <= 0) break;
      const consumed = Math.min(lot.remainingQuantity, quantityToConsume);
      lot.remainingQuantity -= consumed;
      quantityToConsume -= consumed;
    }

    const negativeQuantity = Math.max(0, quantityToConsume);
    if (negativeQuantity > 0) {
      negativeStockSkuCount += 1;
      negativeStockQuantity += negativeQuantity;
    }
    const warningParts: string[] = [];
    if (negativeQuantity > 0) warningParts.push(`Negative Stock / Missing Purchase History: ${negativeQuantity}`);
    if (unagedQuantity > 0) warningParts.push(`Returned stock has no traceable purchase-origin date: ${unagedQuantity}`);
    if (unknownOpeningRemaining > 0) {
      warningParts.push(`Opening Stock Age Unknown: ${unknownOpeningRemaining}`);
      unknownOpeningStockSkuCount += 1;
      unknownOpeningStockQuantity += unknownOpeningRemaining;
    }
    const warningText = warningParts.join('. ');

    for (const lot of state.lots) {
      if (lot.remainingQuantity <= 0) continue;
      const rowKey = [lot.skuNumber, lot.style, lot.productType].join('\u0000');
      const row = groupedRows.get(rowKey) ?? {
        skuNumber: lot.skuNumber,
        itemDescription: lot.itemDescription,
        style: lot.style,
        productType: lot.productType,
        ...emptyBuckets(),
        hasDataWarning: false,
        warningText: '',
      };
      if (row.itemDescription === 'UNMAPPED ITEM DESCRIPTION'
        && lot.itemDescription !== 'UNMAPPED ITEM DESCRIPTION') row.itemDescription = lot.itemDescription;
      const bucket = stockAgeingBucketForDays(ageInDays(asOnDate, lot.date));
      row[bucket] += lot.remainingQuantity;
      if (warningText) {
        row.hasDataWarning = true;
        row.warningText = warningText;
      }
      identifiableRemainingQuantity += lot.remainingQuantity;
      groupedRows.set(rowKey, row);
    }
  }

  const rows = [...groupedRows.values()].sort((left, right) => (
    left.skuNumber.localeCompare(right.skuNumber)
    || left.itemDescription.localeCompare(right.itemDescription)
    || left.style.localeCompare(right.style)
    || left.productType.localeCompare(right.productType)
  ));
  const totals = summarizeStockAgeingRows(rows);
  return {
    asOnDate,
    rows,
    totals,
    negativeStockSkuCount,
    negativeStockQuantity,
    unagedReturnSkuCount,
    unagedReturnQuantity,
    unknownOpeningStockSkuCount,
    unknownOpeningStockQuantity,
    unmappedProductCount: rows.filter((row) => row.productType === 'UNMAPPED PRODUCT').length,
    unmappedStyleCount: rows.filter((row) => row.style === 'UNMAPPED STYLE').length,
    reconciliationDifference: totals.totalStock - identifiableRemainingQuantity,
  };
}

/** Reuses FIFO results while the normalized source version and as-on date are unchanged. */
export function stockAgeingReportFor(
  source: DailySalesCategorySource,
  asOnDate: string,
): StockAgeingResult {
  const sourceReports = reportCache.get(source) ?? new Map<string, StockAgeingResult>();
  const cached = sourceReports.get(asOnDate);
  if (cached) return cached;
  const result = calculateStockAgeingReport(source, asOnDate);
  if (sourceReports.size >= 24) {
    const oldestDate = sourceReports.keys().next().value;
    if (oldestDate) sourceReports.delete(oldestDate);
  }
  sourceReports.set(asOnDate, result);
  reportCache.set(source, sourceReports);
  return result;
}

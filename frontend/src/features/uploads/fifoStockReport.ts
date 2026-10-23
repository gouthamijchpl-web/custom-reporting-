import type { NormalizedInventoryRecord } from './inventoryImport';

const EPSILON = 0.0000001;

export type FifoBatchSource = 'Opening Stock' | 'Purchase' | 'Sales Return';

export interface FifoPurchaseEntry {
  id: string;
  source: 'Opening Stock' | 'Purchase' | 'Purchase Return';
  date: string;
  invoiceNumber: string;
  lineNumber: string;
  quantity: number;
  rate: number | null;
  value: number | null;
  batchLabel: string;
  remainingQuantity: number | null;
  beforePeriod: boolean;
  sourceFile: string;
}

export interface FifoAllocation {
  id: string;
  saleId: string;
  salesInvoice: string;
  salesDate: string;
  purchaseBatchId: string | null;
  purchaseBatch: string;
  purchaseInvoice: string;
  purchaseDate: string;
  quantity: number;
  purchaseRate: number | null;
  fifoCost: number | null;
  salesRate: number | null;
  allocatedSalesValue: number | null;
  grossProfit: number | null;
  unmatched: boolean;
}

export interface FifoSaleEntry {
  id: string;
  date: string;
  invoiceNumber: string;
  lineNumber: string;
  quantity: number;
  rate: number | null;
  salesValue: number | null;
  fifoCogs: number | null;
  grossProfit: number | null;
  grossProfitPercent: number | null;
  unmatchedQuantity: number;
  source: 'Sale' | 'Sales Return';
  sourceFile: string;
  allocations: FifoAllocation[];
}

export interface FifoRemainingBatch {
  id: string;
  batchLabel: string;
  source: FifoBatchSource;
  date: string;
  invoiceNumber: string;
  originalQuantity: number;
  remainingQuantity: number;
  rate: number | null;
  remainingValue: number | null;
}

export interface FifoStockRow {
  stockNumber: string;
  product: string;
  style: string;
  category: string;
  uom: string;
  totalPurchaseQuantity: number;
  totalPurchaseValue: number | null;
  totalSalesQuantity: number;
  totalSalesValue: number | null;
  fifoCogs: number | null;
  grossProfit: number | null;
  grossProfitPercent: number | null;
  closingQuantity: number;
  closingStockValue: number | null;
  unmatchedSaleQuantity: number;
  purchases: FifoPurchaseEntry[];
  sales: FifoSaleEntry[];
  allocations: FifoAllocation[];
  remainingBatches: FifoRemainingBatch[];
  warnings: string[];
}

export interface FifoStockTotals {
  totalPurchaseQuantity: number;
  totalPurchaseValue: number | null;
  totalSalesQuantity: number;
  totalSalesValue: number | null;
  fifoCogs: number | null;
  grossProfit: number | null;
  grossProfitPercent: number | null;
  closingQuantity: number;
  closingStockValue: number | null;
  unmatchedSaleQuantity: number;
}

export interface FifoReportDiagnostics {
  missingStockNumberCount: number;
  invalidRecordCount: number;
  nonFinalizedRecordCount: number;
  duplicateRecordCount: number;
  missingPurchaseRateCount: number;
  missingSalesRateCount: number;
  unmatchedSaleCount: number;
}

export interface FifoStockReportResult {
  fromDate: string;
  toDate: string;
  rows: FifoStockRow[];
  totals: FifoStockTotals;
  diagnostics: FifoReportDiagnostics;
}

interface MutableBatch {
  id: string;
  label: string;
  source: FifoBatchSource;
  date: string;
  invoiceNumber: string;
  originalQuantity: number;
  remainingQuantity: number;
  rate: number | null;
}

interface SaleHistoryAllocation {
  batch: MutableBatch | null;
  remainingQuantity: number;
  rate: number | null;
}

interface MutableStockState {
  stockNumber: string;
  product: string;
  style: string;
  category: string;
  uoms: Set<string>;
  batches: MutableBatch[];
  batchNumber: number;
  deficitQuantity: number;
  saleHistory: SaleHistoryAllocation[][];
  purchases: Array<FifoPurchaseEntry & { batch: MutableBatch | null }>;
  sales: FifoSaleEntry[];
  allocations: FifoAllocation[];
  warnings: Set<string>;
  periodPurchaseQuantity: number;
  periodPurchaseValue: number;
  periodPurchaseValueComplete: boolean;
  periodSalesQuantity: number;
  periodSalesValue: number;
  periodSalesValueComplete: boolean;
  periodFifoCogs: number;
  periodFifoCogsComplete: boolean;
  lifetimeNetStockQuantity: number;
}

function finite(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

export function normalizeStockNumber(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function transactionRate(row: NormalizedInventoryRecord): number | null {
  const mapped = row.transactionType === 'sales' ? row.salesRate : row.rate;
  if (finite(mapped)) return Math.abs(mapped);
  if (finite(row.quantity) && Math.abs(row.quantity) > EPSILON && finite(row.taxableValue)) {
    return Math.abs(row.taxableValue / row.quantity);
  }
  return null;
}

function transactionValue(quantity: number, rate: number | null): number | null {
  return rate == null ? null : quantity * rate;
}

function inPeriod(date: string, fromDate: string, toDate: string): boolean {
  return date >= fromDate && date <= toDate;
}

function compareTransactions(left: NormalizedInventoryRecord, right: NormalizedInventoryRecord): number {
  const typeOrder = (row: NormalizedInventoryRecord) => row.transactionType === 'opening-stock' ? 0 : row.transactionType === 'purchases' ? 1 : 2;
  const dateComparison = (left.invoiceDate ?? '').localeCompare(right.invoiceDate ?? '');
  if (dateComparison !== 0) return dateComparison;
  const typeComparison = typeOrder(left) - typeOrder(right);
  if (typeComparison !== 0) return typeComparison;
  const invoiceComparison = left.invoiceNumber.localeCompare(right.invoiceNumber, undefined, { numeric: true });
  if (invoiceComparison !== 0) return invoiceComparison;
  const lineComparison = left.lineNumber.localeCompare(right.lineNumber, undefined, { numeric: true });
  if (lineComparison !== 0) return lineComparison;
  const fileComparison = left.sourceFile.localeCompare(right.sourceFile);
  return fileComparison !== 0 ? fileComparison : left.sourceRow - right.sourceRow;
}

function emptyState(stockNumber: string): MutableStockState {
  return {
    stockNumber,
    product: '',
    style: '',
    category: '',
    uoms: new Set(),
    batches: [],
    batchNumber: 0,
    deficitQuantity: 0,
    saleHistory: [],
    purchases: [],
    sales: [],
    allocations: [],
    warnings: new Set(),
    periodPurchaseQuantity: 0,
    periodPurchaseValue: 0,
    periodPurchaseValueComplete: true,
    periodSalesQuantity: 0,
    periodSalesValue: 0,
    periodSalesValueComplete: true,
    periodFifoCogs: 0,
    periodFifoCogsComplete: true,
    lifetimeNetStockQuantity: 0,
  };
}

function updateDimensions(state: MutableStockState, row: NormalizedInventoryRecord): void {
  if (!state.product && row.description.trim()) state.product = row.description.trim();
  if (!state.style && row.style.trim()) state.style = row.style.trim();
  if (!state.category && (row.finalProductType.trim() || row.productCategory.trim())) {
    state.category = row.finalProductType.trim() || row.productCategory.trim();
  }
  if (row.uom.trim()) state.uoms.add(row.uom.trim());
}

function nextBatch(
  state: MutableStockState,
  row: NormalizedInventoryRecord,
  quantity: number,
  rate: number | null,
  source: FifoBatchSource,
): MutableBatch {
  state.batchNumber += 1;
  const batch: MutableBatch = {
    id: `${state.stockNumber}\u0000${row.transactionKey}\u0000${state.batchNumber}`,
    label: `FIFO-${String(state.batchNumber).padStart(3, '0')}`,
    source,
    date: row.invoiceDate ?? '',
    invoiceNumber: row.invoiceNumber || (source === 'Opening Stock' ? 'Opening Stock' : 'Sales Return'),
    originalQuantity: quantity,
    remainingQuantity: quantity,
    rate,
  };
  state.batches.push(batch);
  return batch;
}

function addStock(
  state: MutableStockState,
  row: NormalizedInventoryRecord,
  quantity: number,
  rate: number | null,
  source: FifoBatchSource,
): MutableBatch | null {
  let remaining = quantity;
  if (state.deficitQuantity > EPSILON) {
    const covered = Math.min(state.deficitQuantity, remaining);
    state.deficitQuantity -= covered;
    remaining -= covered;
    if (covered > EPSILON) state.warnings.add('Earlier unmatched stock movement reduced a later inbound quantity.');
  }
  return remaining > EPSILON ? nextBatch(state, row, remaining, rate, source) : null;
}

function removeNewestStock(state: MutableStockState, quantity: number): number {
  let remaining = quantity;
  for (let index = state.batches.length - 1; index >= 0 && remaining > EPSILON; index -= 1) {
    const batch = state.batches[index];
    if (batch.remainingQuantity <= EPSILON) continue;
    const removed = Math.min(batch.remainingQuantity, remaining);
    batch.remainingQuantity -= removed;
    remaining -= removed;
  }
  if (remaining > EPSILON) {
    state.deficitQuantity += remaining;
    state.warnings.add('Purchase return or negative adjustment exceeds available stock.');
  }
  return remaining;
}

function positiveSaleAllocations(
  state: MutableStockState,
  row: NormalizedInventoryRecord,
  quantity: number,
  salesRate: number | null,
): { allocations: FifoAllocation[]; history: SaleHistoryAllocation[]; unmatchedQuantity: number } {
  let remaining = quantity;
  const allocations: FifoAllocation[] = [];
  const history: SaleHistoryAllocation[] = [];
  for (const batch of state.batches) {
    if (remaining <= EPSILON) break;
    if (batch.remainingQuantity <= EPSILON) continue;
    const consumed = Math.min(batch.remainingQuantity, remaining);
    batch.remainingQuantity -= consumed;
    remaining -= consumed;
    const fifoCost = batch.rate == null ? null : consumed * batch.rate;
    const allocatedSalesValue = salesRate == null ? null : consumed * salesRate;
    allocations.push({
      id: `${row.transactionKey}\u0000${allocations.length}`,
      saleId: row.transactionKey,
      salesInvoice: row.invoiceNumber || '—',
      salesDate: row.invoiceDate ?? '',
      purchaseBatchId: batch.id,
      purchaseBatch: batch.label,
      purchaseInvoice: batch.invoiceNumber,
      purchaseDate: batch.date,
      quantity: consumed,
      purchaseRate: batch.rate,
      fifoCost,
      salesRate,
      allocatedSalesValue,
      grossProfit: fifoCost == null || allocatedSalesValue == null ? null : allocatedSalesValue - fifoCost,
      unmatched: false,
    });
    history.push({ batch, remainingQuantity: consumed, rate: batch.rate });
  }
  if (remaining > EPSILON) {
    state.deficitQuantity += remaining;
    allocations.push({
      id: `${row.transactionKey}\u0000unmatched`,
      saleId: row.transactionKey,
      salesInvoice: row.invoiceNumber || '—',
      salesDate: row.invoiceDate ?? '',
      purchaseBatchId: null,
      purchaseBatch: 'Unmatched',
      purchaseInvoice: 'No available purchase',
      purchaseDate: '—',
      quantity: remaining,
      purchaseRate: null,
      fifoCost: null,
      salesRate,
      allocatedSalesValue: salesRate == null ? null : remaining * salesRate,
      grossProfit: null,
      unmatched: true,
    });
    history.push({ batch: null, remainingQuantity: remaining, rate: null });
    state.warnings.add('Insufficient Stock / Unmatched Sale');
  }
  return { allocations, history, unmatchedQuantity: remaining };
}

function salesReturnAllocations(
  state: MutableStockState,
  row: NormalizedInventoryRecord,
  returnQuantity: number,
  salesRate: number | null,
): { allocations: FifoAllocation[]; unmatchedQuantity: number } {
  let remaining = returnQuantity;
  const allocations: FifoAllocation[] = [];
  while (remaining > EPSILON && state.saleHistory.length > 0) {
    const previousSale = state.saleHistory[state.saleHistory.length - 1];
    while (remaining > EPSILON && previousSale.length > 0) {
      const previousAllocation = previousSale[previousSale.length - 1];
      const restored = Math.min(previousAllocation.remainingQuantity, remaining);
      previousAllocation.remainingQuantity -= restored;
      remaining -= restored;
      if (previousAllocation.batch) previousAllocation.batch.remainingQuantity += restored;
      else state.deficitQuantity = Math.max(0, state.deficitQuantity - restored);
      const quantity = -restored;
      const fifoCost = previousAllocation.rate == null ? null : quantity * previousAllocation.rate;
      const allocatedSalesValue = salesRate == null ? null : quantity * salesRate;
      allocations.push({
        id: `${row.transactionKey}\u0000${allocations.length}`,
        saleId: row.transactionKey,
        salesInvoice: row.invoiceNumber || '—',
        salesDate: row.invoiceDate ?? '',
        purchaseBatchId: previousAllocation.batch?.id ?? null,
        purchaseBatch: previousAllocation.batch?.label ?? 'Unmatched sale reversal',
        purchaseInvoice: previousAllocation.batch?.invoiceNumber ?? 'No purchase batch',
        purchaseDate: previousAllocation.batch?.date ?? '—',
        quantity,
        purchaseRate: previousAllocation.rate,
        fifoCost,
        salesRate,
        allocatedSalesValue,
        grossProfit: fifoCost == null || allocatedSalesValue == null ? null : allocatedSalesValue - fifoCost,
        unmatched: previousAllocation.batch == null,
      });
      if (previousAllocation.remainingQuantity <= EPSILON) previousSale.pop();
    }
    if (previousSale.length === 0) state.saleHistory.pop();
  }
  if (remaining > EPSILON) {
    const batch = nextBatch(state, row, remaining, null, 'Sales Return');
    state.warnings.add('Sales return exceeds matched sale history; returned stock cost is unknown.');
    allocations.push({
      id: `${row.transactionKey}\u0000unmatched-return`,
      saleId: row.transactionKey,
      salesInvoice: row.invoiceNumber || '—',
      salesDate: row.invoiceDate ?? '',
      purchaseBatchId: batch.id,
      purchaseBatch: batch.label,
      purchaseInvoice: 'Unmatched sales return',
      purchaseDate: row.invoiceDate ?? '',
      quantity: -remaining,
      purchaseRate: null,
      fifoCost: null,
      salesRate,
      allocatedSalesValue: salesRate == null ? null : -remaining * salesRate,
      grossProfit: null,
      unmatched: true,
    });
  }
  return { allocations, unmatchedQuantity: remaining };
}

function sumComplete(values: Array<number | null>): number | null {
  return values.some((value) => value == null) ? null : values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function summarizeFifoRows(rows: readonly FifoStockRow[]): FifoStockTotals {
  const totalPurchaseValue = sumComplete(rows.map((row) => row.totalPurchaseValue));
  const totalSalesValue = sumComplete(rows.map((row) => row.totalSalesValue));
  const fifoCogs = sumComplete(rows.map((row) => row.fifoCogs));
  const grossProfit = totalSalesValue == null || fifoCogs == null ? null : totalSalesValue - fifoCogs;
  const closingStockValue = sumComplete(rows.map((row) => row.closingStockValue));
  return {
    totalPurchaseQuantity: rows.reduce((total, row) => total + row.totalPurchaseQuantity, 0),
    totalPurchaseValue,
    totalSalesQuantity: rows.reduce((total, row) => total + row.totalSalesQuantity, 0),
    totalSalesValue,
    fifoCogs,
    grossProfit,
    grossProfitPercent: grossProfit == null || totalSalesValue == null || totalSalesValue === 0 ? null : (grossProfit / totalSalesValue) * 100,
    closingQuantity: rows.reduce((total, row) => total + row.closingQuantity, 0),
    closingStockValue,
    unmatchedSaleQuantity: rows.reduce((total, row) => total + row.unmatchedSaleQuantity, 0),
  };
}

export function calculateFifoStockReport(
  openingStock: readonly NormalizedInventoryRecord[],
  purchases: readonly NormalizedInventoryRecord[],
  sales: readonly NormalizedInventoryRecord[],
  fromDate: string,
  toDate: string,
): FifoStockReportResult {
  const diagnostics: FifoReportDiagnostics = {
    missingStockNumberCount: 0,
    invalidRecordCount: 0,
    nonFinalizedRecordCount: 0,
    duplicateRecordCount: 0,
    missingPurchaseRateCount: 0,
    missingSalesRateCount: 0,
    unmatchedSaleCount: 0,
  };
  const seen = new Set<string>();
  const transactions = [...openingStock, ...purchases, ...sales].filter((row) => {
    if (row.statusCategory !== 'finalized') {
      diagnostics.nonFinalizedRecordCount += 1;
      return false;
    }
    const stockNumber = normalizeStockNumber(row.itemCode);
    if (!stockNumber) {
      diagnostics.missingStockNumberCount += 1;
      return false;
    }
    if (!row.invoiceDate || !finite(row.quantity) || row.validationIssues.length > 0) {
      diagnostics.invalidRecordCount += 1;
      return false;
    }
    if (seen.has(row.transactionKey)) {
      diagnostics.duplicateRecordCount += 1;
      return false;
    }
    seen.add(row.transactionKey);
    return row.invoiceDate <= toDate;
  }).sort(compareTransactions);
  const states = new Map<string, MutableStockState>();

  for (const row of transactions) {
    const stockNumber = normalizeStockNumber(row.itemCode);
    const state = states.get(stockNumber) ?? emptyState(stockNumber);
    states.set(stockNumber, state);
    updateDimensions(state, row);
    const date = row.invoiceDate ?? '';
    const periodTransaction = inPeriod(date, fromDate, toDate);
    const quantity = row.quantity ?? 0;
    const rate = transactionRate(row);
    const value = transactionValue(quantity, rate);
    state.lifetimeNetStockQuantity += row.transactionType === 'sales' ? -quantity : quantity;

    if (row.transactionType === 'opening-stock' || row.transactionType === 'purchases') {
      const source = row.transactionType === 'opening-stock' ? 'Opening Stock' : quantity < 0 ? 'Purchase Return' : 'Purchase';
      if (rate == null && Math.abs(quantity) > EPSILON) {
        diagnostics.missingPurchaseRateCount += 1;
        state.warnings.add('Missing purchase or opening-stock rate');
      }
      let batch: MutableBatch | null = null;
      if (quantity > EPSILON) batch = addStock(state, row, quantity, rate, source === 'Opening Stock' ? 'Opening Stock' : 'Purchase');
      else if (quantity < -EPSILON) removeNewestStock(state, Math.abs(quantity));
      state.purchases.push({
        id: row.transactionKey,
        source,
        date,
        invoiceNumber: row.invoiceNumber || (source === 'Opening Stock' ? 'Opening Stock' : '—'),
        lineNumber: row.lineNumber,
        quantity,
        rate,
        value,
        batchLabel: batch?.label ?? (source === 'Purchase Return' ? 'Return / adjustment' : 'Absorbed by deficit'),
        remainingQuantity: quantity > EPSILON ? 0 : null,
        beforePeriod: date < fromDate,
        sourceFile: row.sourceFile,
        batch,
      });
      if (periodTransaction) {
        state.periodPurchaseQuantity += quantity;
        if (value == null && Math.abs(quantity) > EPSILON) state.periodPurchaseValueComplete = false;
        else state.periodPurchaseValue += value ?? 0;
      }
      continue;
    }

    if (rate == null && Math.abs(quantity) > EPSILON) {
      diagnostics.missingSalesRateCount += 1;
      state.warnings.add('Missing sales rate');
    }
    let allocationResult: { allocations: FifoAllocation[]; unmatchedQuantity: number };
    if (quantity >= 0) {
      const positiveResult = positiveSaleAllocations(state, row, quantity, rate);
      state.saleHistory.push(positiveResult.history);
      allocationResult = positiveResult;
    } else allocationResult = salesReturnAllocations(state, row, Math.abs(quantity), rate);
    const fifoCogs = sumComplete(allocationResult.allocations.map((allocation) => allocation.fifoCost));
    const salesValue = value;
    const grossProfit = salesValue == null || fifoCogs == null ? null : salesValue - fifoCogs;
    const sale: FifoSaleEntry = {
      id: row.transactionKey,
      date,
      invoiceNumber: row.invoiceNumber || '—',
      lineNumber: row.lineNumber,
      quantity,
      rate,
      salesValue,
      fifoCogs,
      grossProfit,
      grossProfitPercent: grossProfit == null || salesValue == null || salesValue === 0 ? null : (grossProfit / salesValue) * 100,
      unmatchedQuantity: allocationResult.unmatchedQuantity,
      source: quantity < 0 ? 'Sales Return' : 'Sale',
      sourceFile: row.sourceFile,
      allocations: allocationResult.allocations,
    };
    if (periodTransaction) {
      state.sales.push(sale);
      state.allocations.push(...allocationResult.allocations);
      state.periodSalesQuantity += quantity;
      if (salesValue == null && Math.abs(quantity) > EPSILON) state.periodSalesValueComplete = false;
      else state.periodSalesValue += salesValue ?? 0;
      if (fifoCogs == null && Math.abs(quantity) > EPSILON) state.periodFifoCogsComplete = false;
      else state.periodFifoCogs += fifoCogs ?? 0;
      if (allocationResult.unmatchedQuantity > EPSILON) diagnostics.unmatchedSaleCount += 1;
    }
  }

  const rows = [...states.values()].map<FifoStockRow>((state) => {
    if (state.uoms.size > 1) state.warnings.add(`Multiple UOMs found: ${[...state.uoms].join(', ')}`);
    const remainingBatches = state.batches.filter((batch) => batch.remainingQuantity > EPSILON).map<FifoRemainingBatch>((batch) => ({
      id: batch.id,
      batchLabel: batch.label,
      source: batch.source,
      date: batch.date,
      invoiceNumber: batch.invoiceNumber,
      originalQuantity: batch.originalQuantity,
      remainingQuantity: batch.remainingQuantity,
      rate: batch.rate,
      remainingValue: batch.rate == null ? null : batch.remainingQuantity * batch.rate,
    }));
    const closingQuantity = state.lifetimeNetStockQuantity;
    const closingStockValue = state.deficitQuantity > EPSILON
      ? null
      : sumComplete(remainingBatches.map((batch) => batch.remainingValue));
    const totalPurchaseValue = state.periodPurchaseValueComplete ? state.periodPurchaseValue : null;
    const totalSalesValue = state.periodSalesValueComplete ? state.periodSalesValue : null;
    const fifoCogs = state.periodFifoCogsComplete ? state.periodFifoCogs : null;
    const grossProfit = totalSalesValue == null || fifoCogs == null ? null : totalSalesValue - fifoCogs;
    const unmatchedSaleQuantity = state.sales.reduce((total, sale) => total + sale.unmatchedQuantity, 0);
    state.purchases.forEach((purchase) => { purchase.remainingQuantity = purchase.batch?.remainingQuantity ?? purchase.remainingQuantity; });
    return {
      stockNumber: state.stockNumber,
      product: state.product || 'Unmapped description',
      style: state.style || '—',
      category: state.category || '—',
      uom: [...state.uoms].join(', ') || '—',
      totalPurchaseQuantity: state.periodPurchaseQuantity,
      totalPurchaseValue,
      totalSalesQuantity: state.periodSalesQuantity,
      totalSalesValue,
      fifoCogs,
      grossProfit,
      grossProfitPercent: grossProfit == null || totalSalesValue == null || totalSalesValue === 0 ? null : (grossProfit / totalSalesValue) * 100,
      closingQuantity,
      closingStockValue,
      unmatchedSaleQuantity,
      purchases: state.purchases.map(({ batch: _batch, ...purchase }) => purchase),
      sales: state.sales,
      allocations: state.allocations,
      remainingBatches,
      warnings: [...state.warnings],
    };
  }).filter((row) => row.totalPurchaseQuantity !== 0 || row.totalSalesQuantity !== 0 || Math.abs(row.closingQuantity) > EPSILON || row.warnings.length > 0)
    .sort((left, right) => left.stockNumber.localeCompare(right.stockNumber, undefined, { numeric: true }));

  return { fromDate, toDate, rows, totals: summarizeFifoRows(rows), diagnostics };
}

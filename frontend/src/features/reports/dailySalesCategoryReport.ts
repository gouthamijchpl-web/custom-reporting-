import {
  CURRENT_NORMALIZATION_VERSION,
  migrateLegacyImportFile,
  normalizeReportingProduct,
  remapImportFile,
} from '@/features/uploads/inventoryImport';
import type {
  ImportedInventoryFile,
  ImportContext,
  ImportKind,
  LegacyImportedFile,
  NormalizedInventoryRecord,
} from '@/features/uploads/inventoryImport';

export interface DailySalesCategoryRow {
  category: string;
  dailySalesQty: number;
  dailySalesValue: number;
  dailyPurchaseValue: number;
  dailyGrossProfit: number;
  dailyGmPercent: number;
  ytdSalesQty: number;
  ytdTaxableValue: number;
  ytdPurchaseValue: number;
  ytdGrossProfit: number;
  ytdGmPercent: number;
  inwardPurchaseQty: number;
  inwardPurchaseValue: number;
}

export type DailySalesCategoryTotals = Omit<DailySalesCategoryRow, 'category'>;

export interface DailySalesCategoryReportResult {
  reportDate: string;
  financialYearStart: string;
  financialYearLabel: string;
  rows: DailySalesCategoryRow[];
  totals: DailySalesCategoryTotals;
  missingCostRowCount: number;
  missingCostSalesValue: number;
}

export interface DailySalesCategorySource {
  sales: NormalizedInventoryRecord[];
  purchases: NormalizedInventoryRecord[];
  openingStock: NormalizedInventoryRecord[];
  latestSalesDate: string | null;
  sourceFileCount: number;
  openingStockFileCount: number;
}

type UploadsByType = Partial<Record<ImportKind, ImportedInventoryFile[]>>;

interface StoredEntityUploads {
  uploadsByType?: UploadsByType;
}

const UPLOAD_DATABASE_NAME = 'custom-reporting-uploads';
const UPLOAD_STORE_NAME = 'entity-uploads';
const sourceCache = new Map<string, DailySalesCategorySource>();
const sourceRequests = new Map<string, Promise<DailySalesCategorySource>>();

export function invalidateDailySalesCategorySource(scopeId?: string): void {
  if (scopeId) {
    sourceCache.delete(scopeId);
    sourceRequests.delete(scopeId);
    return;
  }
  sourceCache.clear();
  sourceRequests.clear();
}

function openUploadDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(UPLOAD_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(UPLOAD_STORE_NAME)) {
        request.result.createObjectStore(UPLOAD_STORE_NAME, { keyPath: 'entityId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open uploaded data storage.'));
  });
}

function isCurrentUpload(value: unknown): value is ImportedInventoryFile {
  if (!value || typeof value !== 'object') return false;
  const file = value as Partial<ImportedInventoryFile>;
  return typeof file.id === 'string'
    && typeof file.kind === 'string'
    && Array.isArray(file.headers)
    && Array.isArray(file.rawRows)
    && typeof file.mapping === 'object';
}

function isLegacyUpload(value: unknown): value is LegacyImportedFile {
  if (!value || typeof value !== 'object') return false;
  const file = value as Partial<LegacyImportedFile>;
  return typeof file.id === 'string'
    && typeof file.fileName === 'string'
    && typeof file.fileSize === 'number'
    && Array.isArray(file.rows);
}

function normalizeStoredFiles(kind: ImportKind, files: unknown[], context: ImportContext): ImportedInventoryFile[] {
  return files.flatMap((file) => {
    if (isCurrentUpload(file)) return [file.normalizationVersion === CURRENT_NORMALIZATION_VERSION
      ? file
      : remapImportFile(file, file.mapping, context)];
    if (isLegacyUpload(file)) {
      const migrated = migrateLegacyImportFile(kind, file, context);
      return migrated ? [migrated] : [];
    }
    return [];
  });
}

function acceptedUniqueRecords(files: ImportedInventoryFile[], kind: ImportKind): NormalizedInventoryRecord[] {
  const seen = new Set<string>();
  const accepted: NormalizedInventoryRecord[] = [];
  for (const row of files.flatMap((file) => file.normalizedRows)) {
    if (row.transactionType !== kind
      || row.statusCategory !== 'finalized'
      || row.validationIssues.length > 0
      || !row.invoiceDate
      || row.quantity == null
      || seen.has(row.transactionKey)) continue;
    seen.add(row.transactionKey);
    accepted.push(row);
  }
  return accepted;
}

export function loadDailySalesCategorySource(
  scopeId: string,
  context: ImportContext,
): Promise<DailySalesCategorySource> {
  const cached = sourceCache.get(scopeId);
  if (cached) return Promise.resolve(cached);
  const pending = sourceRequests.get(scopeId);
  if (pending) return pending;
  const requestPromise = openUploadDatabase().then((database) => new Promise<DailySalesCategorySource>((resolve, reject) => {
    const transaction = database.transaction(UPLOAD_STORE_NAME, 'readonly');
    const request = transaction.objectStore(UPLOAD_STORE_NAME).get(scopeId);
    request.onsuccess = () => {
      const stored = request.result as StoredEntityUploads | undefined;
      const salesFiles = normalizeStoredFiles('sales', stored?.uploadsByType?.sales ?? [], context);
      const purchaseFiles = normalizeStoredFiles('purchases', stored?.uploadsByType?.purchases ?? [], context);
      const openingStockFiles = normalizeStoredFiles('opening-stock', stored?.uploadsByType?.['opening-stock'] ?? [], context);
      const sales = acceptedUniqueRecords(salesFiles, 'sales');
      const purchases = acceptedUniqueRecords(purchaseFiles, 'purchases');
      const openingStock = acceptedUniqueRecords(openingStockFiles, 'opening-stock');
      const latestSalesDate = sales.reduce<string | null>((latest, row) => (
        row.invoiceDate && (!latest || row.invoiceDate > latest) ? row.invoiceDate : latest
      ), null);
      const source = {
        sales,
        purchases,
        openingStock,
        latestSalesDate,
        sourceFileCount: salesFiles.length + purchaseFiles.length,
        openingStockFileCount: openingStockFiles.length,
      };
      sourceCache.set(scopeId, source);
      resolve(source);
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to read normalized Sales and Purchase data.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Unable to read normalized Sales and Purchase data.'));
    };
  })).finally(() => sourceRequests.delete(scopeId));
  sourceRequests.set(scopeId, requestPromise);
  return requestPromise;
}

export function financialYearFor(reportDate: string): { start: string; label: string } {
  const [yearText, monthText] = reportDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const startYear = month >= 4 ? year : year - 1;
  return {
    start: `${startYear}-04-01`,
    label: `FY${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`,
  };
}

function categoryFor(row: NormalizedInventoryRecord): string {
  return normalizeReportingProduct(row.finalProductType) || 'UNMAPPED CATEGORY';
}

function itemKey(row: NormalizedInventoryRecord): string | null {
  const identifier = row.skuCode || row.articleCode || row.itemCode;
  if (!identifier) return null;
  return identifier.trim().toLocaleUpperCase();
}

function rowValue(row: NormalizedInventoryRecord): number {
  if (row.taxableValue != null && Number.isFinite(row.taxableValue)) return row.taxableValue;
  const unitRate = row.transactionType === 'sales' ? row.salesRate : row.rate;
  return row.quantity != null && unitRate != null ? row.quantity * unitRate : 0;
}

interface CostPoint {
  date: string;
  cumulativeQuantity: number;
  cumulativeValue: number;
}

function buildPurchaseCostIndex(purchases: NormalizedInventoryRecord[]): Map<string, CostPoint[]> {
  const grouped = new Map<string, NormalizedInventoryRecord[]>();
  for (const purchase of purchases) {
    const key = itemKey(purchase);
    if (!key || !purchase.invoiceDate || purchase.quantity == null || purchase.quantity <= 0) continue;
    const list = grouped.get(key) ?? [];
    list.push(purchase);
    grouped.set(key, list);
  }

  const index = new Map<string, CostPoint[]>();
  for (const [key, rows] of grouped) {
    let cumulativeQuantity = 0;
    let cumulativeValue = 0;
    const points = rows
      .sort((left, right) => `${left.invoiceDate}|${left.transactionKey}`.localeCompare(`${right.invoiceDate}|${right.transactionKey}`))
      .map((row) => {
        cumulativeQuantity += row.quantity ?? 0;
        cumulativeValue += rowValue(row);
        return { date: row.invoiceDate ?? '', cumulativeQuantity, cumulativeValue };
      });
    index.set(key, points);
  }
  return index;
}

function weightedAverageCost(
  sale: NormalizedInventoryRecord,
  purchaseCostIndex: Map<string, CostPoint[]>,
): number | null {
  const key = itemKey(sale);
  if (!key || !sale.invoiceDate) return null;
  const points = purchaseCostIndex.get(key);
  if (!points?.length) return null;
  let low = 0;
  let high = points.length - 1;
  let match = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].date <= sale.invoiceDate) {
      match = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  if (match < 0 || points[match].cumulativeQuantity <= 0) return null;
  return points[match].cumulativeValue / points[match].cumulativeQuantity;
}

function emptyRow(category: string): DailySalesCategoryRow {
  return {
    category,
    dailySalesQty: 0,
    dailySalesValue: 0,
    dailyPurchaseValue: 0,
    dailyGrossProfit: 0,
    dailyGmPercent: 0,
    ytdSalesQty: 0,
    ytdTaxableValue: 0,
    ytdPurchaseValue: 0,
    ytdGrossProfit: 0,
    ytdGmPercent: 0,
    inwardPurchaseQty: 0,
    inwardPurchaseValue: 0,
  };
}

function gmPercent(grossProfit: number, salesValue: number): number {
  return salesValue === 0 ? 0 : (grossProfit / salesValue) * 100;
}

export function calculateDailySalesCategoryReport(
  source: DailySalesCategorySource,
  reportDate: string,
): DailySalesCategoryReportResult {
  const financialYear = financialYearFor(reportDate);
  const purchaseCostIndex = buildPurchaseCostIndex(source.purchases);
  const categories = new Map<string, DailySalesCategoryRow>();
  let missingCostRowCount = 0;
  let missingCostSalesValue = 0;
  const getCategory = (category: string) => {
    const current = categories.get(category) ?? emptyRow(category);
    categories.set(category, current);
    return current;
  };

  for (const sale of source.sales) {
    if (!sale.invoiceDate || sale.invoiceDate < financialYear.start || sale.invoiceDate > reportDate) continue;
    const row = getCategory(categoryFor(sale));
    const quantity = sale.quantity ?? 0;
    const salesValue = rowValue(sale);
    const explicitUnitCost = sale.purchasePrice != null && sale.purchasePrice > 0 ? sale.purchasePrice : null;
    const unitCost = explicitUnitCost ?? weightedAverageCost(sale, purchaseCostIndex);
    const purchaseValue = unitCost == null ? 0 : quantity * unitCost;
    if (unitCost == null) {
      missingCostRowCount += 1;
      missingCostSalesValue += salesValue;
    }

    row.ytdSalesQty += quantity;
    row.ytdTaxableValue += salesValue;
    row.ytdPurchaseValue += purchaseValue;
    if (sale.invoiceDate === reportDate) {
      row.dailySalesQty += quantity;
      row.dailySalesValue += salesValue;
      row.dailyPurchaseValue += purchaseValue;
    }
  }

  for (const purchase of source.purchases) {
    if (!purchase.invoiceDate || purchase.invoiceDate < financialYear.start || purchase.invoiceDate > reportDate) continue;
    const row = getCategory(categoryFor(purchase));
    row.inwardPurchaseQty += purchase.quantity ?? 0;
    row.inwardPurchaseValue += rowValue(purchase);
  }

  const rows = [...categories.values()]
    .map((row) => ({
      ...row,
      dailyGrossProfit: row.dailySalesValue - row.dailyPurchaseValue,
      dailyGmPercent: gmPercent(row.dailySalesValue - row.dailyPurchaseValue, row.dailySalesValue),
      ytdGrossProfit: row.ytdTaxableValue - row.ytdPurchaseValue,
      ytdGmPercent: gmPercent(row.ytdTaxableValue - row.ytdPurchaseValue, row.ytdTaxableValue),
    }))
    .sort((left, right) => left.category.localeCompare(right.category));

  const totals = rows.reduce<DailySalesCategoryTotals>((total, row) => ({
    dailySalesQty: total.dailySalesQty + row.dailySalesQty,
    dailySalesValue: total.dailySalesValue + row.dailySalesValue,
    dailyPurchaseValue: total.dailyPurchaseValue + row.dailyPurchaseValue,
    dailyGrossProfit: total.dailyGrossProfit + row.dailyGrossProfit,
    dailyGmPercent: 0,
    ytdSalesQty: total.ytdSalesQty + row.ytdSalesQty,
    ytdTaxableValue: total.ytdTaxableValue + row.ytdTaxableValue,
    ytdPurchaseValue: total.ytdPurchaseValue + row.ytdPurchaseValue,
    ytdGrossProfit: total.ytdGrossProfit + row.ytdGrossProfit,
    ytdGmPercent: 0,
    inwardPurchaseQty: total.inwardPurchaseQty + row.inwardPurchaseQty,
    inwardPurchaseValue: total.inwardPurchaseValue + row.inwardPurchaseValue,
  }), emptyRow('TOTAL'));
  totals.dailyGmPercent = gmPercent(totals.dailyGrossProfit, totals.dailySalesValue);
  totals.ytdGmPercent = gmPercent(totals.ytdGrossProfit, totals.ytdTaxableValue);

  return {
    reportDate,
    financialYearStart: financialYear.start,
    financialYearLabel: financialYear.label,
    rows,
    totals,
    missingCostRowCount,
    missingCostSalesValue,
  };
}

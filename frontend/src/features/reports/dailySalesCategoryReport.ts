import {
  CURRENT_NORMALIZATION_VERSION,
  migrateLegacyImportFile,
  normalizeReportingProduct,
  remapImportFile,
} from '@/features/uploads/inventoryImport';
import { entityApi, uploadApi } from '@/api';
import { calculateGrossProfitLines } from './grossProfitEngine';
import type { GrossProfitLine } from './grossProfitEngine';
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
  grossProfitLines?: GrossProfitLine[];
}

type UploadsByType = Partial<Record<ImportKind, Array<ImportedInventoryFile | LegacyImportedFile>>>;

interface LegacyStoredEntityUploads {
  uploadsByType?: UploadsByType;
}

const LEGACY_UPLOAD_DATABASE_NAME = 'custom-reporting-uploads';
const LEGACY_UPLOAD_STORE_NAME = 'entity-uploads';

const sourceCache = new Map<string, DailySalesCategorySource>();
const sourceRequests = new Map<string, Promise<DailySalesCategorySource>>();

function hasUploadedFiles(value: UploadsByType | undefined): boolean {
  return Object.values(value ?? {}).some((files) => (files?.length ?? 0) > 0);
}

function readLegacyUploads(scopeId: string): Promise<UploadsByType | null> {
  if (!window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    const openRequest = window.indexedDB.open(LEGACY_UPLOAD_DATABASE_NAME, 1);
    openRequest.onerror = () => resolve(null);
    openRequest.onupgradeneeded = () => {
      if (!openRequest.result.objectStoreNames.contains(LEGACY_UPLOAD_STORE_NAME)) {
        openRequest.result.createObjectStore(LEGACY_UPLOAD_STORE_NAME, { keyPath: 'entityId' });
      }
    };
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const transaction = database.transaction(LEGACY_UPLOAD_STORE_NAME, 'readonly');
      const request = transaction.objectStore(LEGACY_UPLOAD_STORE_NAME).get(scopeId);
      request.onsuccess = () => resolve((request.result as LegacyStoredEntityUploads | undefined)?.uploadsByType ?? null);
      request.onerror = () => resolve(null);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
    };
  });
}

function deleteLegacyUploads(scopeId: string): Promise<void> {
  if (!window.indexedDB) return Promise.resolve();
  return new Promise((resolve) => {
    const openRequest = window.indexedDB.open(LEGACY_UPLOAD_DATABASE_NAME, 1);
    openRequest.onerror = () => resolve();
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const transaction = database.transaction(LEGACY_UPLOAD_STORE_NAME, 'readwrite');
      transaction.objectStore(LEGACY_UPLOAD_STORE_NAME).delete(scopeId);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); resolve(); };
    };
  });
}

export function invalidateDailySalesCategorySource(scopeId?: string): void {
  if (scopeId) {
    sourceCache.delete(scopeId);
    sourceRequests.delete(scopeId);
    return;
  }
  sourceCache.clear();
  sourceRequests.clear();
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
  const requestPromise = Promise.all([
    uploadApi.load<UploadsByType>(context.entity.id, context.branch?.id ?? null),
    entityApi.getCostingPolicy(context.entity.id),
  ]).then(async ([stored, costingPolicy]) => {
    let uploadsByType = stored.uploadsByType;
    if (!hasUploadedFiles(uploadsByType)) {
      const legacy = await readLegacyUploads(scopeId);
      if (hasUploadedFiles(legacy ?? undefined)) {
        uploadsByType = legacy ?? {};
        await uploadApi.save(context.entity.id, context.branch?.id ?? null, uploadsByType);
        await deleteLegacyUploads(scopeId);
      }
    }
    const salesFiles = normalizeStoredFiles('sales', uploadsByType?.sales ?? [], context);
    const purchaseFiles = normalizeStoredFiles('purchases', uploadsByType?.purchases ?? [], context);
    const openingStockFiles = normalizeStoredFiles('opening-stock', uploadsByType?.['opening-stock'] ?? [], context);
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
      grossProfitLines: calculateGrossProfitLines(sales, purchases, openingStock, costingPolicy),
    };
    sourceCache.set(scopeId, source);
    return source;
  }).finally(() => sourceRequests.delete(scopeId));
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

function rowValue(row: NormalizedInventoryRecord): number {
  if (row.taxableValue != null && Number.isFinite(row.taxableValue)) return row.taxableValue;
  const unitRate = row.transactionType === 'sales' ? row.salesRate : row.rate;
  return row.quantity != null && unitRate != null ? row.quantity * unitRate : 0;
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
  const grossProfitIndex = new Map((source.grossProfitLines
    ?? calculateGrossProfitLines(source.sales, source.purchases, source.openingStock))
    .map((line) => [line.transactionKey, line]));
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
    const grossProfitLine = grossProfitIndex.get(sale.transactionKey);
    const purchaseValue = grossProfitLine?.cogsAmount ?? 0;
    if (grossProfitLine?.cogsAmount == null) {
      missingCostRowCount += 1;
      missingCostSalesValue += salesValue;
    }

    row.ytdSalesQty += quantity;
    row.ytdTaxableValue += salesValue;
    row.ytdPurchaseValue += purchaseValue;
    row.ytdGrossProfit += grossProfitLine?.grossProfitAmount ?? 0;
    if (sale.invoiceDate === reportDate) {
      row.dailySalesQty += quantity;
      row.dailySalesValue += salesValue;
      row.dailyPurchaseValue += purchaseValue;
      row.dailyGrossProfit += grossProfitLine?.grossProfitAmount ?? 0;
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
      dailyGmPercent: gmPercent(row.dailyGrossProfit, row.dailySalesValue),
      ytdGmPercent: gmPercent(row.ytdGrossProfit, row.ytdTaxableValue),
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

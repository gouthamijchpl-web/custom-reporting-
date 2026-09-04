import { normalizeReportingProduct } from '@/features/uploads/inventoryImport';
import type { NormalizedInventoryRecord } from '@/features/uploads/inventoryImport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';

export type StyleSalesPurchaseStatus =
  | 'Missing Purchase Data'
  | 'Negative Stock'
  | 'Not Sold'
  | 'Fully Sold'
  | 'Partially Sold'
  | 'No Activity';

export interface StyleSalesPurchaseRow {
  style: string;
  product: string;
  totalPurchaseQty: number;
  totalPurchaseValue: number;
  totalSalesQty: number;
  totalSalesValue: number;
  balanceUnsoldQty: number;
  balancePurchaseValue: number;
  status: StyleSalesPurchaseStatus;
  percentage: number;
}

export interface StyleSalesPurchaseTotals {
  totalPurchaseQty: number;
  totalPurchaseValue: number;
  totalSalesQty: number;
  totalSalesValue: number;
  balanceUnsoldQty: number;
  balancePurchaseValue: number;
  percentage: number;
}

export interface StyleSalesPurchaseAnalysisResult {
  fromDate: string;
  toDate: string;
  rows: StyleSalesPurchaseRow[];
  totals: StyleSalesPurchaseTotals;
  unmappedStyleRecordCount: number;
  unmappedProductRecordCount: number;
}

interface MutableStyleSalesPurchaseRow {
  style: string;
  product: string;
  totalPurchaseQty: number;
  totalPurchaseValue: number;
  totalSalesQty: number;
  totalSalesValue: number;
}

const ZERO_TOLERANCE = 1e-9;

function normalizedDimension(value: string, fallback: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase() || fallback;
}

function transactionValue(row: NormalizedInventoryRecord): number {
  if (row.taxableValue != null && Number.isFinite(row.taxableValue)) return row.taxableValue;
  const unitRate = row.transactionType === 'sales' ? row.salesRate : row.rate;
  return row.quantity != null && unitRate != null && Number.isFinite(unitRate)
    ? row.quantity * unitRate
    : 0;
}

function isZero(value: number): boolean {
  return Math.abs(value) < ZERO_TOLERANCE;
}

function statusFor(purchaseQty: number, salesQty: number, balanceQty: number): StyleSalesPurchaseStatus {
  if (isZero(purchaseQty) && salesQty > ZERO_TOLERANCE) return 'Missing Purchase Data';
  if (balanceQty < -ZERO_TOLERANCE) return 'Negative Stock';
  if (isZero(salesQty) && purchaseQty > ZERO_TOLERANCE) return 'Not Sold';
  if (isZero(balanceQty) && purchaseQty > ZERO_TOLERANCE) return 'Fully Sold';
  if (balanceQty > ZERO_TOLERANCE && salesQty > ZERO_TOLERANCE) return 'Partially Sold';
  return 'No Activity';
}

function emptyTotals(): StyleSalesPurchaseTotals {
  return {
    totalPurchaseQty: 0,
    totalPurchaseValue: 0,
    totalSalesQty: 0,
    totalSalesValue: 0,
    balanceUnsoldQty: 0,
    balancePurchaseValue: 0,
    percentage: 0,
  };
}

export function summarizeStyleSalesPurchaseRows(rows: readonly StyleSalesPurchaseRow[]): StyleSalesPurchaseTotals {
  const totals = rows.reduce<StyleSalesPurchaseTotals>((total, row) => ({
    totalPurchaseQty: total.totalPurchaseQty + row.totalPurchaseQty,
    totalPurchaseValue: total.totalPurchaseValue + row.totalPurchaseValue,
    totalSalesQty: total.totalSalesQty + row.totalSalesQty,
    totalSalesValue: total.totalSalesValue + row.totalSalesValue,
    balanceUnsoldQty: total.balanceUnsoldQty + row.balanceUnsoldQty,
    balancePurchaseValue: total.balancePurchaseValue + row.balancePurchaseValue,
    percentage: 0,
  }), emptyTotals());
  totals.percentage = isZero(totals.totalPurchaseQty)
    ? 0
    : (totals.totalSalesQty / totals.totalPurchaseQty) * 100;
  return totals;
}

export function calculateStyleSalesPurchaseAnalysis(
  source: DailySalesCategorySource,
  fromDate: string,
  toDate: string,
): StyleSalesPurchaseAnalysisResult {
  const groupedRows = new Map<string, MutableStyleSalesPurchaseRow>();
  let unmappedStyleRecordCount = 0;
  let unmappedProductRecordCount = 0;

  const addTransaction = (transaction: NormalizedInventoryRecord) => {
    if (!transaction.invoiceDate || transaction.invoiceDate < fromDate || transaction.invoiceDate > toDate) return;
    const style = normalizedDimension(transaction.style, 'UNMAPPED STYLE');
    const product = normalizeReportingProduct(transaction.finalProductType) || 'UNMAPPED PRODUCT';
    if (!transaction.style.trim()) unmappedStyleRecordCount += 1;
    if (!transaction.finalProductType.trim()) unmappedProductRecordCount += 1;
    const key = `${style}\u0000${product}`;
    const row = groupedRows.get(key) ?? {
      style,
      product,
      totalPurchaseQty: 0,
      totalPurchaseValue: 0,
      totalSalesQty: 0,
      totalSalesValue: 0,
    };
    const quantity = transaction.quantity ?? 0;
    const value = transactionValue(transaction);
    if (transaction.transactionType === 'purchases') {
      row.totalPurchaseQty += quantity;
      row.totalPurchaseValue += value;
    } else if (transaction.transactionType === 'sales') {
      row.totalSalesQty += quantity;
      row.totalSalesValue += value;
    }
    groupedRows.set(key, row);
  };

  source.purchases.forEach(addTransaction);
  source.sales.forEach(addTransaction);

  const rows = [...groupedRows.values()].map<StyleSalesPurchaseRow>((row) => {
    const balanceUnsoldQty = row.totalPurchaseQty - row.totalSalesQty;
    const weightedAveragePurchaseRate = isZero(row.totalPurchaseQty)
      ? 0
      : row.totalPurchaseValue / row.totalPurchaseQty;
    return {
      ...row,
      balanceUnsoldQty,
      balancePurchaseValue: isZero(row.totalPurchaseQty) ? 0 : balanceUnsoldQty * weightedAveragePurchaseRate,
      status: statusFor(row.totalPurchaseQty, row.totalSalesQty, balanceUnsoldQty),
      percentage: isZero(row.totalPurchaseQty) ? 0 : (row.totalSalesQty / row.totalPurchaseQty) * 100,
    };
  }).sort((left, right) => left.style.localeCompare(right.style) || left.product.localeCompare(right.product));

  return {
    fromDate,
    toDate,
    rows,
    totals: summarizeStyleSalesPurchaseRows(rows),
    unmappedStyleRecordCount,
    unmappedProductRecordCount,
  };
}

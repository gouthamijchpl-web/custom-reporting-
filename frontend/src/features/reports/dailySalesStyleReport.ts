import { normalizeReportingProduct } from '@/features/uploads/inventoryImport';
import type { NormalizedInventoryRecord } from '@/features/uploads/inventoryImport';
import { financialYearFor } from './dailySalesCategoryReport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';
import { calculateGrossProfitLines } from './grossProfitEngine';

export interface DailySalesStyleRow {
  style: string;
  product: string;
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

export type DailySalesStyleTotals = Omit<DailySalesStyleRow, 'style' | 'product'>;

export interface DailySalesStyleReportResult {
  reportDate: string;
  financialYearStart: string;
  financialYearLabel: string;
  rows: DailySalesStyleRow[];
  totals: DailySalesStyleTotals;
  missingCostRowCount: number;
  missingCostSalesValue: number;
  unmappedStyleRowCount: number;
  unmappedStyleSalesValue: number;
}

function normalizedDimension(value: string, fallback: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase() || fallback;
}

function rowValue(row: NormalizedInventoryRecord): number {
  if (row.taxableValue != null && Number.isFinite(row.taxableValue)) return row.taxableValue;
  const unitRate = row.transactionType === 'sales' ? row.salesRate : row.rate;
  return row.quantity != null && unitRate != null ? row.quantity * unitRate : 0;
}

function emptyRow(style: string, product: string): DailySalesStyleRow {
  return {
    style,
    product,
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

export function calculateDailySalesStyleReport(
  source: DailySalesCategorySource,
  reportDate: string,
): DailySalesStyleReportResult {
  const financialYear = financialYearFor(reportDate);
  const grossProfitIndex = new Map((source.grossProfitLines
    ?? calculateGrossProfitLines(source.sales, source.purchases, source.openingStock))
    .map((line) => [line.transactionKey, line]));
  const groupedRows = new Map<string, DailySalesStyleRow>();
  let missingCostRowCount = 0;
  let missingCostSalesValue = 0;
  let unmappedStyleRowCount = 0;
  let unmappedStyleSalesValue = 0;

  const getRow = (style: string, product: string) => {
    const key = `${style}\u0000${product}`;
    const current = groupedRows.get(key) ?? emptyRow(style, product);
    groupedRows.set(key, current);
    return current;
  };

  for (const sale of source.sales) {
    if (!sale.invoiceDate || sale.invoiceDate < financialYear.start || sale.invoiceDate > reportDate) continue;
    const style = normalizedDimension(sale.style, 'UNMAPPED STYLE');
    const product = normalizeReportingProduct(sale.finalProductType) || 'UNMAPPED PRODUCT';
    const row = getRow(style, product);
    const quantity = sale.quantity ?? 0;
    const salesValue = rowValue(sale);
    const grossProfitLine = grossProfitIndex.get(sale.transactionKey);
    const purchaseValue = grossProfitLine?.cogsAmount ?? 0;
    if (!sale.style.trim()) {
      unmappedStyleRowCount += 1;
      unmappedStyleSalesValue += salesValue;
    }
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
    const style = normalizedDimension(purchase.style, 'UNMAPPED STYLE');
    const product = normalizeReportingProduct(purchase.finalProductType) || 'UNMAPPED PRODUCT';
    const row = getRow(style, product);
    row.inwardPurchaseQty += purchase.quantity ?? 0;
    row.inwardPurchaseValue += rowValue(purchase);
  }

  const rows = [...groupedRows.values()]
    .map((row) => ({
      ...row,
      dailyGmPercent: gmPercent(row.dailyGrossProfit, row.dailySalesValue),
      ytdGmPercent: gmPercent(row.ytdGrossProfit, row.ytdTaxableValue),
    }))
    .sort((left, right) => left.style.localeCompare(right.style) || left.product.localeCompare(right.product));

  const totals = rows.reduce<DailySalesStyleTotals>((total, row) => ({
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
  }), emptyRow('TOTAL', ''));
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
    unmappedStyleRowCount,
    unmappedStyleSalesValue,
  };
}

import { normalizeReportingProduct } from '@/features/uploads/inventoryImport';
import type { NormalizedInventoryRecord } from '@/features/uploads/inventoryImport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';

export interface MonthlyCategoryRow {
  category: string;
  salesQty: number;
  sales: number;
  purchaseQty: number;
  purchases: number;
  grossProfit: number;
  missingCostRowCount: number;
  missingCostSalesValue: number;
}

export interface MonthlyCategoryTotals {
  salesQty: number;
  sales: number;
  purchaseQty: number;
  purchases: number;
  grossProfit: number;
}

export interface MonthlyCategoryMonth {
  index: number;
  key: string;
  shortLabel: string;
  label: string;
  startDate: string;
  endDate: string;
  rows: MonthlyCategoryRow[];
  totals: MonthlyCategoryTotals;
  missingCostRowCount: number;
  missingCostSalesValue: number;
}

export interface MonthlyCategoryReportResult {
  financialYearStartYear: number;
  financialYearLabel: string;
  financialYearStart: string;
  financialYearEnd: string;
  months: MonthlyCategoryMonth[];
  totals: MonthlyCategoryTotals;
  missingCostRowCount: number;
  missingCostSalesValue: number;
  unmappedCategoryRecordCount: number;
}

interface MutableCategoryRow {
  category: string;
  salesQty: number;
  sales: number;
  salesCost: number;
  purchaseQty: number;
  purchases: number;
  missingCostRowCount: number;
  missingCostSalesValue: number;
}

interface MonthDefinition {
  index: number;
  key: string;
  shortLabel: string;
  label: string;
  startDate: string;
  endDate: string;
}

interface CostPoint {
  date: string;
  cumulativeQuantity: number;
  cumulativeValue: number;
}

const MONTH_NAMES = [
  ['APR', 'April'],
  ['MAY', 'May'],
  ['JUN', 'June'],
  ['JUL', 'July'],
  ['AUG', 'August'],
  ['SEP', 'September'],
  ['OCT', 'October'],
  ['NOV', 'November'],
  ['DEC', 'December'],
  ['JAN', 'January'],
  ['FEB', 'February'],
  ['MAR', 'March'],
] as const;

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function financialYearLabel(startYear: number): string {
  return `FY${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

export function financialYearStartYearFor(date: string): number {
  const [year, month] = date.split('-').map(Number);
  return month >= 4 ? year : year - 1;
}

export function financialMonths(startYear: number): MonthDefinition[] {
  return MONTH_NAMES.map(([shortLabel, monthName], index) => {
    const calendarMonth = (index + 3) % 12;
    const year = index < 9 ? startYear : startYear + 1;
    const startDate = isoDate(year, calendarMonth, 1);
    const endDate = isoDate(year, calendarMonth + 1, 0);
    return {
      index,
      key: startDate.slice(0, 7),
      shortLabel,
      label: `${monthName} ${year}`,
      startDate,
      endDate,
    };
  });
}

function normalizedCategory(row: NormalizedInventoryRecord): string {
  return normalizeReportingProduct(row.finalProductType) || 'UNMAPPED CATEGORY';
}

function transactionValue(row: NormalizedInventoryRecord): number {
  if (row.taxableValue != null && Number.isFinite(row.taxableValue)) return row.taxableValue;
  const unitRate = row.transactionType === 'sales' ? row.salesRate : row.rate;
  return row.quantity != null && unitRate != null && Number.isFinite(unitRate)
    ? row.quantity * unitRate
    : 0;
}

function itemKey(row: NormalizedInventoryRecord): string | null {
  const identifier = row.skuCode || row.itemCode || row.articleCode;
  if (!identifier.trim()) return null;
  return `${row.entityId}\u0000${row.branchId ?? ''}\u0000${identifier.trim().toLocaleUpperCase()}`;
}

function buildPurchaseCostIndex(purchases: readonly NormalizedInventoryRecord[]): Map<string, CostPoint[]> {
  const grouped = new Map<string, NormalizedInventoryRecord[]>();
  for (const purchase of purchases) {
    const key = itemKey(purchase);
    if (!key || !purchase.invoiceDate || purchase.quantity == null || purchase.quantity <= 0) continue;
    const rows = grouped.get(key) ?? [];
    rows.push(purchase);
    grouped.set(key, rows);
  }

  const index = new Map<string, CostPoint[]>();
  for (const [key, rows] of grouped) {
    let cumulativeQuantity = 0;
    let cumulativeValue = 0;
    const points = [...rows]
      .sort((left, right) => `${left.invoiceDate}|${left.transactionKey}`.localeCompare(`${right.invoiceDate}|${right.transactionKey}`))
      .map((row) => {
        cumulativeQuantity += row.quantity ?? 0;
        cumulativeValue += transactionValue(row);
        return { date: row.invoiceDate ?? '', cumulativeQuantity, cumulativeValue };
      });
    index.set(key, points);
  }
  return index;
}

function weightedAverageCost(
  sale: NormalizedInventoryRecord,
  purchaseCostIndex: ReadonlyMap<string, CostPoint[]>,
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
    } else {
      high = middle - 1;
    }
  }
  if (match < 0 || points[match].cumulativeQuantity <= 0) return null;
  return points[match].cumulativeValue / points[match].cumulativeQuantity;
}

function emptyMutableRow(category: string): MutableCategoryRow {
  return {
    category,
    salesQty: 0,
    sales: 0,
    salesCost: 0,
    purchaseQty: 0,
    purchases: 0,
    missingCostRowCount: 0,
    missingCostSalesValue: 0,
  };
}

function emptyTotals(): MonthlyCategoryTotals {
  return { salesQty: 0, sales: 0, purchaseQty: 0, purchases: 0, grossProfit: 0 };
}

export function summarizeMonthlyCategoryRows(rows: readonly MonthlyCategoryRow[]): MonthlyCategoryTotals {
  return rows.reduce<MonthlyCategoryTotals>((total, row) => ({
    salesQty: total.salesQty + row.salesQty,
    sales: total.sales + row.sales,
    purchaseQty: total.purchaseQty + row.purchaseQty,
    purchases: total.purchases + row.purchases,
    grossProfit: total.grossProfit + row.grossProfit,
  }), emptyTotals());
}

export function calculateMonthlyCategoryReport(
  source: DailySalesCategorySource,
  startYear: number,
): MonthlyCategoryReportResult {
  const monthDefinitions = financialMonths(startYear);
  const rowsByMonth = new Map(monthDefinitions.map((month) => [month.key, new Map<string, MutableCategoryRow>()]));
  const purchaseCostIndex = buildPurchaseCostIndex(source.purchases);
  let unmappedCategoryRecordCount = 0;

  const getRow = (record: NormalizedInventoryRecord): MutableCategoryRow | null => {
    if (!record.invoiceDate) return null;
    const monthRows = rowsByMonth.get(record.invoiceDate.slice(0, 7));
    if (!monthRows) return null;
    const category = normalizedCategory(record);
    if (!record.finalProductType.trim()) unmappedCategoryRecordCount += 1;
    const row = monthRows.get(category) ?? emptyMutableRow(category);
    monthRows.set(category, row);
    return row;
  };

  for (const sale of source.sales) {
    const row = getRow(sale);
    if (!row) continue;
    const quantity = sale.quantity ?? 0;
    const salesValue = transactionValue(sale);
    const explicitUnitCost = sale.purchasePrice != null && sale.purchasePrice > 0 ? sale.purchasePrice : null;
    const unitCost = explicitUnitCost ?? weightedAverageCost(sale, purchaseCostIndex);
    row.salesQty += quantity;
    row.sales += salesValue;
    if (unitCost == null) {
      row.missingCostRowCount += 1;
      row.missingCostSalesValue += salesValue;
    } else {
      row.salesCost += quantity * unitCost;
    }
  }

  for (const purchase of source.purchases) {
    const row = getRow(purchase);
    if (!row) continue;
    row.purchaseQty += purchase.quantity ?? 0;
    row.purchases += transactionValue(purchase);
  }

  const months = monthDefinitions.map<MonthlyCategoryMonth>((month) => {
    const rows = [...(rowsByMonth.get(month.key)?.values() ?? [])]
      .map<MonthlyCategoryRow>((row) => ({
        category: row.category,
        salesQty: row.salesQty,
        sales: row.sales,
        purchaseQty: row.purchaseQty,
        purchases: row.purchases,
        grossProfit: row.sales - row.salesCost,
        missingCostRowCount: row.missingCostRowCount,
        missingCostSalesValue: row.missingCostSalesValue,
      }))
      .sort((left, right) => left.category.localeCompare(right.category));
    return {
      ...month,
      rows,
      totals: summarizeMonthlyCategoryRows(rows),
      missingCostRowCount: rows.reduce((total, row) => total + row.missingCostRowCount, 0),
      missingCostSalesValue: rows.reduce((total, row) => total + row.missingCostSalesValue, 0),
    };
  });

  return {
    financialYearStartYear: startYear,
    financialYearLabel: financialYearLabel(startYear),
    financialYearStart: monthDefinitions[0].startDate,
    financialYearEnd: monthDefinitions[11].endDate,
    months,
    totals: months.reduce<MonthlyCategoryTotals>((total, month) => ({
      salesQty: total.salesQty + month.totals.salesQty,
      sales: total.sales + month.totals.sales,
      purchaseQty: total.purchaseQty + month.totals.purchaseQty,
      purchases: total.purchases + month.totals.purchases,
      grossProfit: total.grossProfit + month.totals.grossProfit,
    }), emptyTotals()),
    missingCostRowCount: months.reduce((total, month) => total + month.missingCostRowCount, 0),
    missingCostSalesValue: months.reduce((total, month) => total + month.missingCostSalesValue, 0),
    unmappedCategoryRecordCount,
  };
}

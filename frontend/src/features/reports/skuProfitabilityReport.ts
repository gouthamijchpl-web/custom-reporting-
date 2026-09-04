import { normalizeReportingProduct } from '@/features/uploads/inventoryImport';
import type { NormalizedInventoryRecord } from '@/features/uploads/inventoryImport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';
import { financialMonths, financialYearLabel } from './monthlyCategoryReport';

export interface SkuProfitabilityRow {
  stockNumber: string;
  itemDescription: string;
  finalProductType: string;
  style: string;
  salesQuantity: number;
  taxableValue: number;
  itemRate: number;
  purchasePrice: number | null;
  purchaseValue: number | null;
  grossProfit: number | null;
  month: string;
  monthKey: string;
  missingPurchaseCostCount: number;
  missingPurchaseCostSalesValue: number;
}

export interface SkuProfitabilityTotals {
  salesQuantity: number;
  taxableValue: number;
  itemRate: number;
  purchasePrice: number | null;
  purchaseValue: number | null;
  grossProfit: number | null;
  missingPurchaseCostCount: number;
  missingPurchaseCostSalesValue: number;
}

export interface SkuProfitabilityResult {
  financialYearStartYear: number;
  financialYearLabel: string;
  financialYearStart: string;
  financialYearEnd: string;
  rows: SkuProfitabilityRow[];
  totals: SkuProfitabilityTotals;
  missingPurchaseCostCount: number;
  missingPurchaseCostSalesValue: number;
  unmappedProductCount: number;
  unmappedStyleCount: number;
}

interface MutableSkuProfitabilityRow {
  stockNumber: string;
  itemDescription: string;
  finalProductType: string;
  style: string;
  salesQuantity: number;
  taxableValue: number;
  knownPurchaseValue: number;
  month: string;
  monthKey: string;
  missingPurchaseCostCount: number;
  missingPurchaseCostSalesValue: number;
}

interface CostPoint {
  date: string;
  cumulativeQuantity: number;
  cumulativeValue: number;
}

interface DescriptionPoint {
  date: string;
  description: string;
}

function normalizedDimension(value: string | null | undefined, fallback: string): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase() || fallback;
}

function identifierCandidates(row: NormalizedInventoryRecord): string[] {
  return [...new Set([row.itemCode, row.skuCode, row.articleCode]
    .map((value) => value.trim().toLocaleUpperCase())
    .filter(Boolean))];
}

function scopedIdentifierKey(row: NormalizedInventoryRecord, identifier: string): string {
  return `${row.entityId}\u0000${row.branchId ?? ''}\u0000${identifier}`;
}

function transactionValue(row: NormalizedInventoryRecord): number {
  if (row.taxableValue != null && Number.isFinite(row.taxableValue)) return row.taxableValue;
  const rate = row.transactionType === 'sales' ? row.salesRate : row.rate;
  return row.quantity != null && rate != null ? row.quantity * rate : 0;
}

function buildPurchaseCostIndex(purchases: readonly NormalizedInventoryRecord[]): Map<string, CostPoint[]> {
  const grouped = new Map<string, NormalizedInventoryRecord[]>();
  for (const purchase of purchases) {
    if (!purchase.invoiceDate || purchase.quantity == null || purchase.quantity <= 0) continue;
    for (const identifier of identifierCandidates(purchase)) {
      const key = scopedIdentifierKey(purchase, identifier);
      const rows = grouped.get(key) ?? [];
      rows.push(purchase);
      grouped.set(key, rows);
    }
  }

  const index = new Map<string, CostPoint[]>();
  for (const [key, rows] of grouped) {
    let cumulativeQuantity = 0;
    let cumulativeValue = 0;
    const points = [...rows]
      .sort((left, right) => `${left.invoiceDate}|${left.transactionKey}`.localeCompare(`${right.invoiceDate}|${right.transactionKey}`))
      .map((purchase) => {
        cumulativeQuantity += purchase.quantity ?? 0;
        cumulativeValue += transactionValue(purchase);
        return { date: purchase.invoiceDate ?? '', cumulativeQuantity, cumulativeValue };
      });
    index.set(key, points);
  }
  return index;
}

function buildPurchaseDescriptionIndex(purchases: readonly NormalizedInventoryRecord[]): Map<string, DescriptionPoint[]> {
  const index = new Map<string, DescriptionPoint[]>();
  for (const purchase of purchases) {
    const description = purchase.description.trim();
    if (!description || !purchase.invoiceDate) continue;
    for (const identifier of identifierCandidates(purchase)) {
      const key = scopedIdentifierKey(purchase, identifier);
      const points = index.get(key) ?? [];
      points.push({ date: purchase.invoiceDate, description });
      index.set(key, points);
    }
  }
  for (const points of index.values()) points.sort((left, right) => left.date.localeCompare(right.date));
  return index;
}

function latestPointIndex<T extends { date: string }>(points: readonly T[], date: string): number {
  let low = 0;
  let high = points.length - 1;
  let match = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].date <= date) {
      match = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return match;
}

function historicalPurchaseCost(
  sale: NormalizedInventoryRecord,
  purchaseCostIndex: ReadonlyMap<string, CostPoint[]>,
): number | null {
  if (!sale.invoiceDate) return null;
  for (const identifier of identifierCandidates(sale)) {
    const points = purchaseCostIndex.get(scopedIdentifierKey(sale, identifier));
    if (!points?.length) continue;
    const match = latestPointIndex(points, sale.invoiceDate);
    if (match >= 0 && points[match].cumulativeQuantity > 0) {
      return points[match].cumulativeValue / points[match].cumulativeQuantity;
    }
  }
  return null;
}

function saleDescription(
  sale: NormalizedInventoryRecord,
  purchaseDescriptionIndex: ReadonlyMap<string, DescriptionPoint[]>,
): string {
  if (sale.description.trim()) return sale.description.trim();
  if (!sale.invoiceDate) return 'UNMAPPED ITEM DESCRIPTION';
  for (const identifier of identifierCandidates(sale)) {
    const points = purchaseDescriptionIndex.get(scopedIdentifierKey(sale, identifier));
    if (!points?.length) continue;
    const match = latestPointIndex(points, sale.invoiceDate);
    if (match >= 0) return points[match].description;
  }
  return 'UNMAPPED ITEM DESCRIPTION';
}

function monthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return `${new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))}-${year}`;
}

export function summarizeSkuProfitabilityRows(rows: readonly SkuProfitabilityRow[]): SkuProfitabilityTotals {
  const salesQuantity = rows.reduce((total, row) => total + row.salesQuantity, 0);
  const taxableValue = rows.reduce((total, row) => total + row.taxableValue, 0);
  const missingPurchaseCostCount = rows.reduce((total, row) => total + row.missingPurchaseCostCount, 0);
  const missingPurchaseCostSalesValue = rows.reduce((total, row) => total + row.missingPurchaseCostSalesValue, 0);
  const hasMissingCost = missingPurchaseCostCount > 0;
  const knownPurchaseValue = rows.reduce((total, row) => total + (row.purchaseValue ?? 0), 0);
  const purchaseValue = hasMissingCost ? null : knownPurchaseValue;
  return {
    salesQuantity,
    taxableValue,
    itemRate: salesQuantity > 0 ? taxableValue / salesQuantity : 0,
    purchasePrice: purchaseValue != null && salesQuantity > 0 ? purchaseValue / salesQuantity : purchaseValue == null ? null : 0,
    purchaseValue,
    grossProfit: purchaseValue == null ? null : taxableValue - purchaseValue,
    missingPurchaseCostCount,
    missingPurchaseCostSalesValue,
  };
}

export function calculateSkuProfitabilityReport(
  source: DailySalesCategorySource,
  startYear: number,
): SkuProfitabilityResult {
  const months = financialMonths(startYear);
  const periodStart = months[0].startDate;
  const periodEnd = months[11].endDate;
  const purchaseCostIndex = buildPurchaseCostIndex(source.purchases);
  const purchaseDescriptionIndex = buildPurchaseDescriptionIndex(source.purchases);
  const grouped = new Map<string, MutableSkuProfitabilityRow>();
  let missingPurchaseCostCount = 0;
  let missingPurchaseCostSalesValue = 0;
  let unmappedProductCount = 0;
  let unmappedStyleCount = 0;

  for (const sale of source.sales) {
    if (!sale.invoiceDate || sale.invoiceDate < periodStart || sale.invoiceDate > periodEnd) continue;
    const monthKey = sale.invoiceDate.slice(0, 7);
    const stockNumber = identifierCandidates(sale)[0] ?? 'UNMAPPED STOCK NUMBER';
    const itemDescription = saleDescription(sale, purchaseDescriptionIndex);
    const finalProductType = normalizeReportingProduct(sale.finalProductType) || 'UNMAPPED PRODUCT';
    const style = normalizedDimension(sale.style, 'UNMAPPED STYLE');
    const key = [stockNumber, itemDescription, finalProductType, style, monthKey].join('\u0000');
    const row = grouped.get(key) ?? {
      stockNumber,
      itemDescription,
      finalProductType,
      style,
      salesQuantity: 0,
      taxableValue: 0,
      knownPurchaseValue: 0,
      month: monthDisplay(monthKey),
      monthKey,
      missingPurchaseCostCount: 0,
      missingPurchaseCostSalesValue: 0,
    };
    const quantity = sale.quantity ?? 0;
    const taxableValue = transactionValue(sale);
    const explicitCost = sale.purchasePrice != null && sale.purchasePrice > 0 ? sale.purchasePrice : null;
    const unitCost = explicitCost ?? historicalPurchaseCost(sale, purchaseCostIndex);
    row.salesQuantity += quantity;
    row.taxableValue += taxableValue;
    if (quantity !== 0 && unitCost == null) {
      row.missingPurchaseCostCount += 1;
      row.missingPurchaseCostSalesValue += taxableValue;
      missingPurchaseCostCount += 1;
      missingPurchaseCostSalesValue += taxableValue;
    } else row.knownPurchaseValue += quantity * (unitCost ?? 0);
    if (!sale.finalProductType.trim()) unmappedProductCount += 1;
    if (!sale.style.trim()) unmappedStyleCount += 1;
    grouped.set(key, row);
  }

  const rows = [...grouped.values()].map<SkuProfitabilityRow>((row) => {
    const hasMissingCost = row.missingPurchaseCostCount > 0;
    const purchaseValue = hasMissingCost ? null : row.knownPurchaseValue;
    return {
      stockNumber: row.stockNumber,
      itemDescription: row.itemDescription,
      finalProductType: row.finalProductType,
      style: row.style,
      salesQuantity: row.salesQuantity,
      taxableValue: row.taxableValue,
      itemRate: row.salesQuantity > 0 ? row.taxableValue / row.salesQuantity : 0,
      purchasePrice: purchaseValue != null && row.salesQuantity > 0 ? purchaseValue / row.salesQuantity : purchaseValue == null ? null : 0,
      purchaseValue,
      grossProfit: purchaseValue == null ? null : row.taxableValue - purchaseValue,
      month: row.month,
      monthKey: row.monthKey,
      missingPurchaseCostCount: row.missingPurchaseCostCount,
      missingPurchaseCostSalesValue: row.missingPurchaseCostSalesValue,
    };
  }).sort((left, right) => left.monthKey.localeCompare(right.monthKey)
    || left.stockNumber.localeCompare(right.stockNumber)
    || left.style.localeCompare(right.style));

  return {
    financialYearStartYear: startYear,
    financialYearLabel: financialYearLabel(startYear),
    financialYearStart: periodStart,
    financialYearEnd: periodEnd,
    rows,
    totals: summarizeSkuProfitabilityRows(rows),
    missingPurchaseCostCount,
    missingPurchaseCostSalesValue,
    unmappedProductCount,
    unmappedStyleCount,
  };
}

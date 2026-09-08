import type { NormalizedInventoryRecord } from '@/features/uploads/inventoryImport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';

export type MisRowKind = 'currency' | 'percentage' | 'section';
export type MisRowEmphasis = 'normal' | 'key' | 'positive' | 'subtotal' | 'strong-subtotal' | 'result';

export type MisExpenseKey =
  | 'freightOutward'
  | 'packingCharges'
  | 'loadingUnloading'
  | 'salaries'
  | 'rent'
  | 'indirectCommissionBrokerage'
  | 'utilityCharges'
  | 'officeExpenses'
  | 'professionalFees'
  | 'repairMaintenance'
  | 'otherExpenses'
  | 'bankCharges'
  | 'interestCost'
  | 'partnersRemuneration'
  | 'oneOffCommissionBrokerage'
  | 'ratesAndTaxes'
  | 'cgtmseFees';

export type MisExpenseSection = 'direct' | 'indirect' | 'finance' | 'oneOff';
export type MisManualRowColor = 'white' | 'orange' | 'green' | 'blue' | 'grey';

export interface MisManualRow {
  id: string;
  label: string;
  section: MisExpenseSection;
  monthlyValues: readonly number[];
  color?: MisManualRowColor;
}

/**
 * Deliberately separate from inventory calculations so a future ledger, voucher,
 * trial-balance, expense upload, or accounting integration can supply these values
 * without changing the MIS matrix.
 */
export interface MisExpenseSource {
  monthlyValues?: Partial<Record<MisExpenseKey, readonly number[]>>;
  configuredSections?: Partial<Record<MisExpenseSection, boolean>>;
}

export interface MisCogsRow {
  key: string;
  label: string;
  kind: MisRowKind;
  emphasis: MisRowEmphasis;
  monthlyValues: readonly number[] | null;
  total: number | null;
  manualId?: string;
  manualColor?: MisManualRowColor;
}

export interface MisCogsMonth {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface MisCogsReportResult {
  financialYearStartYear: number;
  financialYearLabel: string;
  financialYearStart: string;
  financialYearEnd: string;
  months: MisCogsMonth[];
  rows: MisCogsRow[];
  missingCostRowCount: number;
  missingCostSalesValue: number;
  missingCostRowsByMonth: readonly number[];
  expenseSectionsConfigured: Readonly<Record<MisExpenseSection, boolean>>;
}

interface CostPoint {
  date: string;
  cumulativeQuantity: number;
  cumulativeValue: number;
}

const MONTH_NAMES = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'] as const;

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function misFinancialYearLabel(startYear: number): string {
  return `FY${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

export function misFinancialYearStartYearFor(date: string): number {
  const [year, month] = date.split('-').map(Number);
  return month >= 4 ? year : year - 1;
}

function financialMonths(startYear: number) {
  return MONTH_NAMES.map((shortLabel, index) => {
    const calendarMonth = (index + 3) % 12;
    const year = index < 9 ? startYear : startYear + 1;
    const startDate = isoDate(year, calendarMonth, 1);
    return {
      index,
      key: startDate.slice(0, 7),
      shortLabel,
      startDate,
      endDate: isoDate(year, calendarMonth + 1, 0),
    };
  });
}

const EXPENSE_KEYS: readonly MisExpenseKey[] = [
  'freightOutward',
  'packingCharges',
  'loadingUnloading',
  'salaries',
  'rent',
  'indirectCommissionBrokerage',
  'utilityCharges',
  'officeExpenses',
  'professionalFees',
  'repairMaintenance',
  'otherExpenses',
  'bankCharges',
  'interestCost',
  'partnersRemuneration',
  'oneOffCommissionBrokerage',
  'ratesAndTaxes',
  'cgtmseFees',
] as const;

export const MIS_PARTICULAR_LABELS = [
  'Sales',
  'Gross Profit',
  'Gross Profit %',
  'Direct Expenses',
  'Freight Outward',
  'Packing Charges',
  'Loading & Unloading',
  'Total Direct Expenses',
  'Contribution',
  'Indirect Expenses',
  'Salaries',
  'Rent',
  'Commission & Brokerage',
  'Utility Charges',
  'Office Expenses',
  'Professional Fees',
  'Repair & Maintenance',
  'Other Expenses',
  'Finance Cost',
  'Bank Charges',
  'Interest Cost',
  'Total Finance Cost',
  'Total Indirect Expenses',
  'One Off Expenses',
  'Partners Remuneration',
  'Commission & Brokerage',
  'Rates and Taxes',
  'CGTMSE Fees',
  'Total One off Expenses',
  'Net Operating Profit',
  'Net Operating Profit %',
] as const;

function emptySeries(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function validNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function transactionValue(row: NormalizedInventoryRecord): number {
  if (validNumber(row.taxableValue)) return row.taxableValue;
  const rate = row.transactionType === 'sales' ? row.salesRate : row.rate;
  return validNumber(row.quantity) && validNumber(rate) ? row.quantity * rate : 0;
}

function identifierCandidates(row: NormalizedInventoryRecord): string[] {
  return [...new Set([row.itemCode, row.skuCode, row.articleCode]
    .map((value) => value.trim().toLocaleUpperCase())
    .filter(Boolean))];
}

function scopedIdentifierKey(row: NormalizedInventoryRecord, identifier: string): string {
  return `${row.entityId}\u0000${row.branchId ?? ''}\u0000${identifier}`;
}

function purchaseValue(row: NormalizedInventoryRecord): number | null {
  if (!validNumber(row.quantity) || row.quantity <= 0) return null;
  if (validNumber(row.taxableValue) && row.taxableValue >= 0) return row.taxableValue;
  if (validNumber(row.rate) && row.rate > 0) return row.quantity * row.rate;
  return null;
}

function buildPurchaseCostIndex(purchases: readonly NormalizedInventoryRecord[]): Map<string, CostPoint[]> {
  const grouped = new Map<string, NormalizedInventoryRecord[]>();
  for (const purchase of purchases) {
    if (!purchase.invoiceDate || purchaseValue(purchase) == null) continue;
    for (const identifier of identifierCandidates(purchase)) {
      const key = scopedIdentifierKey(purchase, identifier);
      const records = grouped.get(key) ?? [];
      records.push(purchase);
      grouped.set(key, records);
    }
  }

  const index = new Map<string, CostPoint[]>();
  for (const [key, records] of grouped) {
    let cumulativeQuantity = 0;
    let cumulativeValue = 0;
    const points = [...records]
      .sort((left, right) => `${left.invoiceDate}|${left.transactionKey}`.localeCompare(`${right.invoiceDate}|${right.transactionKey}`))
      .map((record) => {
        cumulativeQuantity += record.quantity ?? 0;
        cumulativeValue += purchaseValue(record) ?? 0;
        return {
          date: record.invoiceDate ?? '',
          cumulativeQuantity,
          cumulativeValue,
        };
      });
    index.set(key, points);
  }
  return index;
}

function latestPointAtOrBefore(points: readonly CostPoint[], date: string): CostPoint | null {
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
  return match >= 0 ? points[match] : null;
}

function historicalUnitCost(
  sale: NormalizedInventoryRecord,
  costIndex: ReadonlyMap<string, CostPoint[]>,
): number | null {
  if (!sale.invoiceDate) return null;
  for (const identifier of identifierCandidates(sale)) {
    const points = costIndex.get(scopedIdentifierKey(sale, identifier));
    if (!points?.length) continue;
    const point = latestPointAtOrBefore(points, sale.invoiceDate);
    if (point && point.cumulativeQuantity > 0) {
      return point.cumulativeValue / point.cumulativeQuantity;
    }
  }
  return null;
}

function seriesTotal(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sumSeries(...series: readonly (readonly number[])[]): number[] {
  return Array.from({ length: 12 }, (_, index) => (
    series.reduce((total, values) => total + (values[index] ?? 0), 0)
  ));
}

function subtractSeries(left: readonly number[], ...right: readonly (readonly number[])[]): number[] {
  return Array.from({ length: 12 }, (_, index) => (
    left[index] - right.reduce((total, values) => total + (values[index] ?? 0), 0)
  ));
}

function percentageSeries(numerator: readonly number[], denominator: readonly number[]): number[] {
  return numerator.map((value, index) => denominator[index] === 0 ? 0 : (value / denominator[index]) * 100);
}

function expenseSeries(expenses: MisExpenseSource | undefined, key: MisExpenseKey): number[] {
  const supplied = expenses?.monthlyValues?.[key];
  return Array.from({ length: 12 }, (_, index) => {
    const value = supplied?.[index];
    return validNumber(value) ? value : 0;
  });
}

function row(
  key: string,
  label: string,
  monthlyValues: readonly number[],
  kind: Exclude<MisRowKind, 'section'> = 'currency',
  emphasis: MisRowEmphasis = 'normal',
  totalOverride?: number,
): MisCogsRow {
  return {
    key,
    label,
    kind,
    emphasis,
    monthlyValues,
    total: totalOverride ?? seriesTotal(monthlyValues),
  };
}

function section(key: string, label: string): MisCogsRow {
  return { key, label, kind: 'section', emphasis: 'normal', monthlyValues: null, total: null };
}

function normalizedManualColor(value: MisManualRowColor | undefined): MisManualRowColor {
  return value === 'orange' || value === 'green' || value === 'blue' || value === 'grey'
    ? value
    : 'white';
}

function normalizedManualRows(rows: readonly MisManualRow[]): MisManualRow[] {
  return rows.flatMap((manualRow) => {
    const label = manualRow.label.trim().replace(/\s+/g, ' ');
    if (!manualRow.id || !label || !['direct', 'indirect', 'finance', 'oneOff'].includes(manualRow.section)) return [];
    return [{
      ...manualRow,
      label,
      color: normalizedManualColor(manualRow.color),
      monthlyValues: Array.from({ length: 12 }, (_, index) => {
        const value = manualRow.monthlyValues[index];
        return validNumber(value) ? value : 0;
      }),
    }];
  });
}

function manualReportRow(manualRow: MisManualRow): MisCogsRow {
  return {
    ...row(`manual:${manualRow.id}`, manualRow.label, manualRow.monthlyValues),
    manualId: manualRow.id,
    manualColor: manualRow.color ?? 'white',
  };
}

export function availableMisFinancialYears(source: DailySalesCategorySource, today: string): number[] {
  const years = new Set<number>([misFinancialYearStartYearFor(today)]);
  for (const record of [...source.sales, ...source.purchases]) {
    if (record.invoiceDate) years.add(misFinancialYearStartYearFor(record.invoiceDate));
  }
  return [...years].sort((left, right) => right - left);
}

export function calculateMisCogsReport(
  source: DailySalesCategorySource,
  startYear: number,
  manualRows: readonly MisManualRow[] = [],
  expenses?: MisExpenseSource,
): MisCogsReportResult {
  const definitions = financialMonths(startYear);
  const monthIndex = new Map(definitions.map((month) => [month.key, month.index]));
  const sales = emptySeries();
  const cogs = emptySeries();
  const missingCostRowsByMonth = emptySeries();
  let missingCostRowCount = 0;
  let missingCostSalesValue = 0;
  const purchaseCostIndex = buildPurchaseCostIndex(source.purchases);

  for (const sale of source.sales) {
    if (!sale.invoiceDate) continue;
    const index = monthIndex.get(sale.invoiceDate.slice(0, 7));
    if (index == null) continue;
    const value = transactionValue(sale);
    const quantity = sale.quantity ?? 0;
    const explicitUnitCost = validNumber(sale.purchasePrice) && sale.purchasePrice > 0
      ? sale.purchasePrice
      : null;
    const unitCost = explicitUnitCost ?? historicalUnitCost(sale, purchaseCostIndex);
    sales[index] += value;
    if (quantity !== 0 && unitCost == null) {
      missingCostRowsByMonth[index] += 1;
      missingCostRowCount += 1;
      missingCostSalesValue += value;
    } else {
      cogs[index] += quantity * (unitCost ?? 0);
    }
  }

  const grossProfit = subtractSeries(sales, cogs);
  const grossProfitPercent = percentageSeries(grossProfit, sales);

  const expenseValues = Object.fromEntries(
    EXPENSE_KEYS.map((key) => [key, expenseSeries(expenses, key)]),
  ) as Record<MisExpenseKey, number[]>;
  const normalizedManual = normalizedManualRows(manualRows);
  const manualRowsBySection = (sectionName: MisExpenseSection) => normalizedManual.filter((manualRow) => manualRow.section === sectionName);
  const manualSectionTotals = (sectionName: MisExpenseSection) => sumSeries(
    ...manualRowsBySection(sectionName).map((manualRow) => manualRow.monthlyValues),
  );

  const totalDirectExpenses = sumSeries(
    expenseValues.freightOutward,
    expenseValues.packingCharges,
    expenseValues.loadingUnloading,
    manualSectionTotals('direct'),
  );
  const contribution = subtractSeries(grossProfit, totalDirectExpenses);
  const totalFinanceCost = sumSeries(
    expenseValues.bankCharges,
    expenseValues.interestCost,
    manualSectionTotals('finance'),
  );
  const totalIndirectExpenses = sumSeries(
    expenseValues.salaries,
    expenseValues.rent,
    expenseValues.indirectCommissionBrokerage,
    expenseValues.utilityCharges,
    expenseValues.officeExpenses,
    expenseValues.professionalFees,
    expenseValues.repairMaintenance,
    expenseValues.otherExpenses,
    manualSectionTotals('indirect'),
    totalFinanceCost,
  );
  const totalOneOffExpenses = sumSeries(
    expenseValues.partnersRemuneration,
    expenseValues.oneOffCommissionBrokerage,
    expenseValues.ratesAndTaxes,
    expenseValues.cgtmseFees,
    manualSectionTotals('oneOff'),
  );
  const netOperatingProfit = subtractSeries(contribution, totalIndirectExpenses, totalOneOffExpenses);
  const netOperatingProfitPercent = percentageSeries(netOperatingProfit, sales);

  const totalSales = seriesTotal(sales);
  const totalGrossProfit = seriesTotal(grossProfit);
  const totalNetOperatingProfit = seriesTotal(netOperatingProfit);
  const rows: MisCogsRow[] = [
    row('sales', 'Sales', sales, 'currency', 'key'),
    row('grossProfit', 'Gross Profit', grossProfit, 'currency', 'positive'),
    row('grossProfitPercent', 'Gross Profit %', grossProfitPercent, 'percentage', 'normal', totalSales === 0 ? 0 : (totalGrossProfit / totalSales) * 100),
    section('directExpenses', 'Direct Expenses'),
    row('freightOutward', 'Freight Outward', expenseValues.freightOutward),
    row('packingCharges', 'Packing Charges', expenseValues.packingCharges),
    row('loadingUnloading', 'Loading & Unloading', expenseValues.loadingUnloading),
    ...manualRowsBySection('direct').map(manualReportRow),
    row('totalDirectExpenses', 'Total Direct Expenses', totalDirectExpenses, 'currency', 'subtotal'),
    row('contribution', 'Contribution', contribution, 'currency', 'strong-subtotal'),
    section('indirectExpenses', 'Indirect Expenses'),
    row('salaries', 'Salaries', expenseValues.salaries),
    row('rent', 'Rent', expenseValues.rent),
    row('indirectCommissionBrokerage', 'Commission & Brokerage', expenseValues.indirectCommissionBrokerage),
    row('utilityCharges', 'Utility Charges', expenseValues.utilityCharges),
    row('officeExpenses', 'Office Expenses', expenseValues.officeExpenses),
    row('professionalFees', 'Professional Fees', expenseValues.professionalFees),
    row('repairMaintenance', 'Repair & Maintenance', expenseValues.repairMaintenance),
    row('otherExpenses', 'Other Expenses', expenseValues.otherExpenses),
    ...manualRowsBySection('indirect').map(manualReportRow),
    section('financeCost', 'Finance Cost'),
    row('bankCharges', 'Bank Charges', expenseValues.bankCharges),
    row('interestCost', 'Interest Cost', expenseValues.interestCost),
    ...manualRowsBySection('finance').map(manualReportRow),
    row('totalFinanceCost', 'Total Finance Cost', totalFinanceCost, 'currency', 'subtotal'),
    row('totalIndirectExpenses', 'Total Indirect Expenses', totalIndirectExpenses, 'currency', 'strong-subtotal'),
    section('oneOffExpenses', 'One Off Expenses'),
    row('partnersRemuneration', 'Partners Remuneration', expenseValues.partnersRemuneration),
    row('oneOffCommissionBrokerage', 'Commission & Brokerage', expenseValues.oneOffCommissionBrokerage),
    row('ratesAndTaxes', 'Rates and Taxes', expenseValues.ratesAndTaxes),
    row('cgtmseFees', 'CGTMSE Fees', expenseValues.cgtmseFees),
    ...manualRowsBySection('oneOff').map(manualReportRow),
    row('totalOneOffExpenses', 'Total One off Expenses', totalOneOffExpenses, 'currency', 'subtotal'),
    row('netOperatingProfit', 'Net Operating Profit', netOperatingProfit, 'currency', 'result'),
    row('netOperatingProfitPercent', 'Net Operating Profit %', netOperatingProfitPercent, 'percentage', 'result', totalSales === 0 ? 0 : (totalNetOperatingProfit / totalSales) * 100),
  ];

  const configuredSections: Record<MisExpenseSection, boolean> = {
    direct: expenses?.configuredSections?.direct === true,
    indirect: expenses?.configuredSections?.indirect === true,
    finance: expenses?.configuredSections?.finance === true,
    oneOff: expenses?.configuredSections?.oneOff === true,
  };

  return {
    financialYearStartYear: startYear,
    financialYearLabel: misFinancialYearLabel(startYear),
    financialYearStart: definitions[0].startDate,
    financialYearEnd: definitions[11].endDate,
    months: definitions.map((month) => ({
      key: month.key,
      label: `${month.shortLabel.slice(0, 1)}${month.shortLabel.slice(1).toLocaleLowerCase()}-${month.startDate.slice(2, 4)}`,
      startDate: month.startDate,
      endDate: month.endDate,
    })),
    rows,
    missingCostRowCount,
    missingCostSalesValue,
    missingCostRowsByMonth,
    expenseSectionsConfigured: configuredSections,
  };
}

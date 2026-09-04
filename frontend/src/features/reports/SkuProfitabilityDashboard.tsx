import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircleIcon, SearchIcon } from '@/components/icons';
import { Alert, Badge, Button, LoadingState, Select, TextInput } from '@/components/ui';
import { useBranches, useEntities } from '@/hooks';
import { loadDailySalesCategorySource } from './dailySalesCategoryReport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';
import {
  financialMonths,
  financialYearLabel,
  financialYearStartYearFor,
} from './monthlyCategoryReport';
import {
  calculateSkuProfitabilityReport,
  summarizeSkuProfitabilityRows,
} from './skuProfitabilityReport';
import type { SkuProfitabilityRow } from './skuProfitabilityReport';
import './DailySalesCategoryDashboard.css';
import './SkuProfitabilityDashboard.css';

type SortKey = 'stockNumber' | 'itemDescription' | 'finalProductType' | 'style' | 'salesQuantity'
  | 'taxableValue' | 'itemRate' | 'purchasePrice' | 'purchaseValue' | 'grossProfit' | 'month';
type SortDirection = 'ascending' | 'descending';

interface ReportLoadState {
  scopeId: string;
  source: DailySalesCategorySource | null;
  error: string | null;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const RATE_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const QUANTITY_FORMATTER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const PAGE_SIZE = 200;
const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.valueOf() - offset).toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`));
}

function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

function formatRate(value: number | null): string {
  return value == null ? 'N/A' : RATE_FORMATTER.format(value);
}

function formatValue(value: number | null): string {
  return value == null ? 'N/A' : formatCurrency(value);
}

function financialYearOptions(source: DailySalesCategorySource): Array<{ value: string; label: string }> {
  const years = new Set<number>([financialYearStartYearFor(todayIso())]);
  for (const row of [...source.sales, ...source.purchases]) {
    if (row.invoiceDate) years.add(financialYearStartYearFor(row.invoiceDate));
  }
  return [...years]
    .sort((left, right) => right - left)
    .map((year) => ({ value: String(year), label: financialYearLabel(year) }));
}

function SortHeader({ label, column, activeColumn, direction, onSort }: {
  label: string;
  column: SortKey;
  activeColumn: SortKey;
  direction: SortDirection;
  onSort: (column: SortKey) => void;
}) {
  const active = column === activeColumn;
  return <th scope="col" aria-sort={active ? direction : 'none'}>
    <button type="button" className="category-sales-table__sort" onClick={() => onSort(column)}>
      {label}<span aria-hidden="true">{active ? direction === 'ascending' ? '↑' : '↓' : '↕'}</span>
    </button>
  </th>;
}

function sortableValue(row: SkuProfitabilityRow, column: SortKey): string | number | null {
  if (column === 'month') return row.monthKey;
  return row[column];
}

export function SkuProfitabilityDashboard() {
  const { selectedEntity } = useEntities();
  const { status: branchStatus, selectableBranches, selectedBranch } = useBranches();
  const selectedEntityId = selectedEntity?.id ?? null;
  const scopeId = selectedEntityId && branchStatus === 'ready'
    ? selectableBranches.length === 0 ? selectedEntityId : selectedBranch ? `${selectedEntityId}:branch:${selectedBranch.id}` : null
    : null;
  const currentFinancialYear = financialYearStartYearFor(todayIso());
  const requestRef = useRef(0);
  const [loadState, setLoadState] = useState<ReportLoadState | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentFinancialYear);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sortColumn, setSortColumn] = useState<SortKey>('month');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!scopeId || !selectedEntity) return;
    void loadDailySalesCategorySource(scopeId, { entity: selectedEntity, branch: selectedBranch })
      .then((loaded) => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: loaded, error: null });
        setSelectedYear(currentFinancialYear);
        setSelectedMonth('all');
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: null, error: 'The normalized Sales and Purchase data could not be read from this browser.' });
      });
  }, [currentFinancialYear, scopeId, selectedBranch, selectedEntity]);

  const source = loadState?.scopeId === scopeId ? loadState.source : null;
  const loadError = loadState?.scopeId === scopeId ? loadState.error : null;
  const yearOptions = useMemo(() => source ? financialYearOptions(source) : [], [source]);
  const monthOptions = useMemo(() => [
    { value: 'all', label: 'All Months' },
    ...financialMonths(selectedYear).map((month) => ({ value: month.key, label: `${month.shortLabel[0]}${month.shortLabel.slice(1).toLocaleLowerCase()}-${month.key.slice(0, 4)}` })),
  ], [selectedYear]);
  const result = useMemo(
    () => source ? calculateSkuProfitabilityReport(source, selectedYear) : null,
    [selectedYear, source],
  );
  const visibleRows = useMemo(() => {
    if (!result) return [];
    const term = deferredQuery.trim().toLocaleLowerCase();
    const filtered = result.rows.filter((row) => (
      (selectedMonth === 'all' || row.monthKey === selectedMonth)
      && (!term || [row.stockNumber, row.itemDescription, row.finalProductType, row.style]
        .some((value) => value.toLocaleLowerCase().includes(term)))
    ));
    return [...filtered].sort((left, right) => {
      const leftValue = sortableValue(left, sortColumn);
      const rightValue = sortableValue(right, sortColumn);
      let comparison: number;
      if (leftValue == null && rightValue == null) comparison = 0;
      else if (leftValue == null) comparison = 1;
      else if (rightValue == null) comparison = -1;
      else if (typeof leftValue === 'string' && typeof rightValue === 'string') comparison = leftValue.localeCompare(rightValue);
      else comparison = Number(leftValue) - Number(rightValue);
      if (comparison === 0 && sortColumn !== 'stockNumber') comparison = left.stockNumber.localeCompare(right.stockNumber);
      return sortDirection === 'ascending' ? comparison : -comparison;
    });
  }, [deferredQuery, result, selectedMonth, sortColumn, sortDirection]);
  const visibleTotals = useMemo(() => summarizeSkuProfitabilityRows(visibleRows), [visibleRows]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const displayedRows = visibleRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleSort = (column: SortKey) => {
    setPageIndex(0);
    if (column === sortColumn) {
      setSortDirection((current) => current === 'ascending' ? 'descending' : 'ascending');
      return;
    }
    setSortColumn(column);
    setSortDirection(['stockNumber', 'itemDescription', 'finalProductType', 'style', 'month'].includes(column) ? 'ascending' : 'descending');
  };
  const handleYearChange = (value: string) => {
    setSelectedYear(Number(value));
    setSelectedMonth('all');
    setQuery('');
    setPageIndex(0);
  };
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    setPageIndex(0);
  };

  if (!selectedEntity) return <Alert variant="info" title="Select an entity">Choose an active entity from the top bar to view this report.</Alert>;
  if (branchStatus === 'loading' || (scopeId && loadState?.scopeId !== scopeId)) return <LoadingState message="Preparing SKU profitability report…" />;
  if (branchStatus === 'error') return <Alert variant="danger" title="Branch unavailable">The active branch could not be loaded. Retry from the branch selector.</Alert>;
  if (!scopeId) return <Alert variant="info" title="Select a branch">Choose an active branch from the top bar to view this report.</Alert>;
  if (loadError) return <Alert variant="danger" title="Report unavailable">{loadError}</Alert>;
  if (!result || !source) return <LoadingState message="Preparing SKU profitability report…" />;

  return <div className="sku-profitability-dashboard">
    {visibleTotals.missingPurchaseCostCount > 0 && <Alert variant="warning" title="Missing Purchase Cost">
      {visibleTotals.missingPurchaseCostCount} sales {visibleTotals.missingPurchaseCostCount === 1 ? 'row is' : 'rows are'} missing purchase cost. Gross Profit is shown as N/A for affected rows and totals ({formatCurrency(visibleTotals.missingPurchaseCostSalesValue)} sales value affected).
    </Alert>}
    {(result.unmappedProductCount > 0 || result.unmappedStyleCount > 0) && <Alert variant="warning" title="Data-quality warning">
      {result.unmappedProductCount > 0 && <span>{result.unmappedProductCount} sales {result.unmappedProductCount === 1 ? 'row is' : 'rows are'} grouped under Unmapped Product. </span>}
      {result.unmappedStyleCount > 0 && <span>{result.unmappedStyleCount} sales {result.unmappedStyleCount === 1 ? 'row is' : 'rows are'} grouped under Unmapped Style.</span>}
    </Alert>}

    <section className="category-sales sku-profitability" aria-labelledby="sku-profitability-title">
      <header className="category-sales__header sku-profitability__header">
        <div className="sku-profitability__heading">
          <span className="sales-kpi-section__eyebrow">SKU + Sales Month</span>
          <h2 id="sku-profitability-title">SKU-wise profitability</h2>
          <p>{result.financialYearLabel} · {formatDate(result.financialYearStart)} – {formatDate(result.financialYearEnd)}</p>
        </div>
        <div className="sku-profitability__filters" aria-label="Report filters">
          <label htmlFor="sku-profitability-financial-year"><span>Financial Year</span><Select id="sku-profitability-financial-year" value={String(selectedYear)} options={yearOptions} onValueChange={handleYearChange} /></label>
          <label htmlFor="sku-profitability-month"><span>Month</span><Select id="sku-profitability-month" value={selectedMonth} options={monthOptions} onValueChange={handleMonthChange} /></label>
          <label className="sku-profitability__search" htmlFor="sku-profitability-search"><span>Search</span><TextInput id="sku-profitability-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPageIndex(0); }} leadingIcon={<SearchIcon size={16} />} placeholder="Stock / Description / Product / Style" /></label>
          <Badge tone="neutral">{visibleRows.length} of {result.rows.length}</Badge>
        </div>
      </header>

      <div className="category-sales-table-wrap sku-profitability__table-wrap">
        <table className="category-sales-table sku-profitability-table">
          <caption className="sr-only">SKU-wise profitability using normalized Sales and historical Purchase costs</caption>
          <thead><tr>
            <SortHeader label="Stock Number" column="stockNumber" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Item Description" column="itemDescription" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Final Product Type" column="finalProductType" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Style" column="style" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Sales Quantity" column="salesQuantity" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Taxable Value" column="taxableValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Item Rate" column="itemRate" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Purchase Price" column="purchasePrice" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Purchase Value" column="purchaseValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Gross Profit" column="grossProfit" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Month" column="month" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
          </tr></thead>
          <tbody>{displayedRows.length > 0 ? displayedRows.map((row) => <tr key={[row.stockNumber, row.itemDescription, row.finalProductType, row.style, row.monthKey].join('\u0000')}>
            <th scope="row">{row.stockNumber}</th>
            <td title={row.itemDescription}>{row.itemDescription}</td>
            <td>{row.finalProductType}</td>
            <td>{row.style}</td>
            <td>{QUANTITY_FORMATTER.format(row.salesQuantity)}</td>
            <td>{formatCurrency(row.taxableValue)}</td>
            <td>{formatRate(row.itemRate)}</td>
            <td className={row.purchasePrice == null ? 'sku-profitability-table__missing' : undefined}>{formatRate(row.purchasePrice)}</td>
            <td className={row.purchaseValue == null ? 'sku-profitability-table__missing' : undefined}>{formatValue(row.purchaseValue)}</td>
            <td className={row.grossProfit == null ? 'sku-profitability-table__missing' : row.grossProfit < 0 ? 'category-sales-table__negative' : 'sku-profitability-table__positive'}>{formatValue(row.grossProfit)}</td>
            <td>{row.month}</td>
          </tr>) : <tr><td className="category-sales-table__empty" colSpan={11}>{query || selectedMonth !== 'all' ? 'No SKU profitability rows match the selected filters.' : `No finalized Sales data is available for ${result.financialYearLabel}.`}</td></tr>}</tbody>
          <tfoot><tr>
            <th scope="row">TOTAL</th>
            <td aria-label="Item Description total"></td>
            <td aria-label="Final Product Type total"></td>
            <td aria-label="Style total"></td>
            <td>{QUANTITY_FORMATTER.format(visibleTotals.salesQuantity)}</td>
            <td>{formatCurrency(visibleTotals.taxableValue)}</td>
            <td>{formatRate(visibleTotals.itemRate)}</td>
            <td className={visibleTotals.purchasePrice == null ? 'sku-profitability-table__missing' : undefined}>{formatRate(visibleTotals.purchasePrice)}</td>
            <td className={visibleTotals.purchaseValue == null ? 'sku-profitability-table__missing' : undefined}>{formatValue(visibleTotals.purchaseValue)}</td>
            <td className={visibleTotals.grossProfit == null ? 'sku-profitability-table__missing' : visibleTotals.grossProfit < 0 ? 'category-sales-table__negative' : 'sku-profitability-table__positive'}>{formatValue(visibleTotals.grossProfit)}</td>
            <td aria-label="Month total"></td>
          </tr></tfoot>
        </table>
      </div>
      <footer className="category-sales__footer sku-profitability__footer">
        <span>{source.sourceFileCount} normalized source {source.sourceFileCount === 1 ? 'file' : 'files'}</span>
        {visibleRows.length > 0 && <div className="sku-profitability__pagination" aria-label="SKU table pages">
          <span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, visibleRows.length)} of {visibleRows.length}</span>
          <Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPageIndex((page) => Math.max(0, page - 1))}>Previous</Button>
          <Button variant="ghost" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPageIndex((page) => Math.min(pageCount - 1, page + 1))}>Next</Button>
        </div>}
        <span><AlertCircleIcon size={13} /> Duplicate and non-finalized transactions excluded</span>
      </footer>
    </section>
  </div>;
}

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircleIcon, SearchIcon } from '@/components/icons';
import { Alert, Badge, Button, LoadingState, Select, TextInput } from '@/components/ui';
import { useBranches, useEntities } from '@/hooks';
import { loadDailySalesCategorySource } from './dailySalesCategoryReport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';
import {
  calculateMonthlyCategoryReport,
  financialYearLabel,
  financialYearStartYearFor,
} from './monthlyCategoryReport';
import type { MonthlyCategoryRow } from './monthlyCategoryReport';
import './DailySalesCategoryDashboard.css';
import './MonthlyCategoryDashboard.css';

type SortKey = 'category' | 'salesQty' | 'sales' | 'purchaseQty' | 'purchases' | 'grossProfit';
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
const QUANTITY_FORMATTER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
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

function formatQuantity(value: number): string {
  return QUANTITY_FORMATTER.format(value);
}

function defaultMonthIndex(startYear: number): number {
  const today = todayIso();
  const currentStartYear = financialYearStartYearFor(today);
  if (currentStartYear !== startYear) return 0;
  const month = Number(today.slice(5, 7));
  return month >= 4 ? month - 4 : month + 8;
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

export function MonthlyCategoryDashboard() {
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
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(() => defaultMonthIndex(currentFinancialYear));
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sortColumn, setSortColumn] = useState<SortKey>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!scopeId || !selectedEntity) return;
    void loadDailySalesCategorySource(scopeId, { entity: selectedEntity, branch: selectedBranch })
      .then((loaded) => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: loaded, error: null });
        setSelectedYear(currentFinancialYear);
        setSelectedMonthIndex(defaultMonthIndex(currentFinancialYear));
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: null, error: 'The normalized Sales and Purchase data could not be read from this browser.' });
      });
  }, [currentFinancialYear, scopeId, selectedBranch, selectedEntity]);

  const source = loadState?.scopeId === scopeId ? loadState.source : null;
  const loadError = loadState?.scopeId === scopeId ? loadState.error : null;
  const yearOptions = useMemo(() => source ? financialYearOptions(source) : [], [source]);
  const result = useMemo(
    () => source ? calculateMonthlyCategoryReport(source, selectedYear) : null,
    [selectedYear, source],
  );
  const monthOptions = useMemo(() => result?.months.map((month) => ({
    value: String(month.index),
    label: month.label,
  })) ?? [], [result]);
  const selectedMonth = result?.months[selectedMonthIndex] ?? null;
  const visibleRows = useMemo(() => {
    if (!selectedMonth) return [];
    const term = deferredQuery.trim().toLocaleLowerCase();
    const rows = selectedMonth.rows.filter((row) => !term || row.category.toLocaleLowerCase().includes(term));
    return [...rows].sort((left, right) => {
      const comparison = sortColumn === 'category'
        ? left.category.localeCompare(right.category)
        : left[sortColumn] - right[sortColumn];
      return sortDirection === 'ascending' ? comparison : -comparison;
    });
  }, [deferredQuery, selectedMonth, sortColumn, sortDirection]);

  const handleYearChange = (value: string) => {
    const year = Number(value);
    setSelectedYear(year);
    setSelectedMonthIndex(defaultMonthIndex(year));
    setQuery('');
  };
  const handleSort = (column: SortKey) => {
    if (column === sortColumn) {
      setSortDirection((current) => current === 'ascending' ? 'descending' : 'ascending');
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'category' ? 'ascending' : 'descending');
  };
  const handleMonthChange = (value: string) => {
    setSelectedMonthIndex(Number(value));
    setQuery('');
  };

  if (!selectedEntity) return <Alert variant="info" title="Select an entity">Choose an active entity from the top bar to view this report.</Alert>;
  if (branchStatus === 'loading' || (scopeId && loadState?.scopeId !== scopeId)) return <LoadingState message="Preparing monthly category-wise report…" />;
  if (branchStatus === 'error') return <Alert variant="danger" title="Branch unavailable">The active branch could not be loaded. Retry from the branch selector.</Alert>;
  if (!scopeId) return <Alert variant="info" title="Select a branch">Choose an active branch from the top bar to view this report.</Alert>;
  if (loadError) return <Alert variant="danger" title="Report unavailable">{loadError}</Alert>;
  if (!result || !source || !selectedMonth) return <LoadingState message="Preparing monthly category-wise report…" />;

  return <div className="monthly-category-dashboard">
    <section className="monthly-category-overview" aria-label="Financial year and selected month summary">
      <div className="monthly-category-overview__left">
        <div className="monthly-category-period">
          <label htmlFor="monthly-category-financial-year"><span>Financial Year</span><Select id="monthly-category-financial-year" value={String(selectedYear)} options={yearOptions} onValueChange={handleYearChange} /></label>
          <label htmlFor="monthly-category-month"><span>Month</span><Select id="monthly-category-month" value={String(selectedMonthIndex)} options={monthOptions} onValueChange={handleMonthChange} /></label>
        </div>
        <div className="monthly-category-fy-actions">
          <div className="monthly-category-fy-info"><Badge tone="accent">{result.financialYearLabel}</Badge><span>{formatDate(result.financialYearStart)} – {formatDate(result.financialYearEnd)}</span></div>
          <Button variant="secondary" size="sm" aria-expanded={showAllMonths} aria-controls="monthly-category-all-months" onClick={() => setShowAllMonths((current) => !current)}>{showAllMonths ? 'Hide Months' : 'All Months'}</Button>
        </div>
      </div>
      <div className="monthly-category-selected-summary" aria-label={`${selectedMonth.label} summary`}>
        <span className="sales-kpi-section__eyebrow">Selected month summary</span>
        <article className="monthly-category-selected-card">
          <header><strong>{selectedMonth.shortLabel} {selectedMonth.label.slice(-4)}</strong><span>Summary</span></header>
          <dl>
            <div><dt>Sales Qty</dt><dd>{formatQuantity(selectedMonth.totals.salesQty)}</dd></div>
            <div><dt>Sales</dt><dd>{formatCurrency(selectedMonth.totals.sales)}</dd></div>
            <div><dt>Purchase Qty</dt><dd>{formatQuantity(selectedMonth.totals.purchaseQty)}</dd></div>
            <div><dt>Purchases</dt><dd>{formatCurrency(selectedMonth.totals.purchases)}</dd></div>
            <div><dt>Gross Profit</dt><dd className={selectedMonth.totals.grossProfit < 0 ? 'monthly-category-negative' : undefined}>{formatCurrency(selectedMonth.totals.grossProfit)}{selectedMonth.missingCostRowCount > 0 && <sup title="Gross profit has missing purchase cost">*</sup>}</dd></div>
          </dl>
        </article>
      </div>
    </section>

    {showAllMonths && <section id="monthly-category-all-months" className="monthly-category-months" aria-labelledby="financial-year-months-title">
      <header><div><span className="sales-kpi-section__eyebrow">Financial year months</span><h2 id="financial-year-months-title">{result.financialYearLabel} monthly performance</h2></div><span>Select a month to update the summary and category breakdown</span></header>
      <div className="monthly-category-month-grid">{result.months.map((month) => {
        const selected = month.index === selectedMonthIndex;
        return <button key={month.key} type="button" className={`monthly-category-month-card${selected ? ' monthly-category-month-card--selected' : ''}`} aria-pressed={selected} onClick={() => { setSelectedMonthIndex(month.index); setQuery(''); setShowAllMonths(false); }}>
          <header><strong>{month.shortLabel}</strong><span>{month.label.slice(-4)}</span></header>
          <dl>
            <div><dt>Sales Qty</dt><dd>{formatQuantity(month.totals.salesQty)}</dd></div>
            <div><dt>Sales</dt><dd>{formatCurrency(month.totals.sales)}</dd></div>
            <div><dt>Purchase Qty</dt><dd>{formatQuantity(month.totals.purchaseQty)}</dd></div>
            <div><dt>Purchases</dt><dd>{formatCurrency(month.totals.purchases)}</dd></div>
            <div className="monthly-category-month-card__gross"><dt>Gross Profit</dt><dd className={month.totals.grossProfit < 0 ? 'monthly-category-negative' : undefined}>{formatCurrency(month.totals.grossProfit)}{month.missingCostRowCount > 0 && <sup title="Gross profit has missing purchase cost">*</sup>}</dd></div>
          </dl>
        </button>;
      })}</div>
    </section>}

    {!showAllMonths && <>
    {(result.unmappedCategoryRecordCount > 0 || result.missingCostRowCount > 0) && <Alert variant="warning" title="Report data needs attention">
      {result.unmappedCategoryRecordCount > 0 && <span>{result.unmappedCategoryRecordCount} {result.unmappedCategoryRecordCount === 1 ? 'transaction is' : 'transactions are'} grouped under Unmapped Category. </span>}
      {result.missingCostRowCount > 0 && <span>{result.missingCostRowCount} sales {result.missingCostRowCount === 1 ? 'transaction has' : 'transactions have'} no matched purchase cost ({formatCurrency(result.missingCostSalesValue)} sales value).</span>}
    </Alert>}

    {selectedMonth.missingCostRowCount > 0 && <Alert variant="warning" title="Missing Purchase Cost">
      Gross Profit for {selectedMonth.label} is provisional: {selectedMonth.missingCostRowCount} sales {selectedMonth.missingCostRowCount === 1 ? 'transaction is' : 'transactions are'} missing cost, affecting {formatCurrency(selectedMonth.missingCostSalesValue)} of Sales.
    </Alert>}

    <section className="category-sales monthly-category-breakdown" aria-labelledby="monthly-category-breakdown-title">
      <header className="category-sales__header">
        <div><span className="sales-kpi-section__eyebrow">Selected month</span><h2 id="monthly-category-breakdown-title">{selectedMonth.label}</h2><p>Monthly category-wise breakdown</p></div>
        <div className="category-sales__tools"><TextInput id="monthly-category-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leadingIcon={<SearchIcon size={16} />} placeholder="Search Category" aria-label="Search Category" /><Badge tone="neutral">{visibleRows.length} of {selectedMonth.rows.length}</Badge></div>
      </header>
      <div className="category-sales-table-wrap monthly-category-table-wrap">
        <table className="category-sales-table monthly-category-table">
          <caption className="sr-only">Category-wise Sales, Purchases and Gross Profit for {selectedMonth.label}</caption>
          <thead><tr>
            <SortHeader label="Category" column="category" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Sales QTY" column="salesQty" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Sales" column="sales" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Purchase Qty" column="purchaseQty" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Purchases" column="purchases" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Gross Profit" column="grossProfit" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
          </tr></thead>
          <tbody>{visibleRows.length > 0 ? visibleRows.map((row: MonthlyCategoryRow) => <tr key={row.category}>
            <th scope="row">{row.category}</th>
            <td>{formatQuantity(row.salesQty)}</td>
            <td>{formatCurrency(row.sales)}</td>
            <td>{formatQuantity(row.purchaseQty)}</td>
            <td>{formatCurrency(row.purchases)}</td>
            <td className={row.grossProfit < 0 ? 'category-sales-table__negative' : undefined}>{formatCurrency(row.grossProfit)}{row.missingCostRowCount > 0 && <sup className="monthly-category-cost-flag" title={`${row.missingCostRowCount} sales transactions have missing purchase cost`}>*</sup>}</td>
          </tr>) : <tr><td className="category-sales-table__empty" colSpan={6}>{query ? `No Category matches “${query.trim()}”.` : `No Sales or Purchase data is available for ${selectedMonth.label}.`}</td></tr>}</tbody>
          <tfoot><tr>
            <th scope="row">TOTAL</th>
            <td>{formatQuantity(selectedMonth.totals.salesQty)}</td>
            <td>{formatCurrency(selectedMonth.totals.sales)}</td>
            <td>{formatQuantity(selectedMonth.totals.purchaseQty)}</td>
            <td>{formatCurrency(selectedMonth.totals.purchases)}</td>
            <td className={selectedMonth.totals.grossProfit < 0 ? 'category-sales-table__negative' : undefined}>{formatCurrency(selectedMonth.totals.grossProfit)}{selectedMonth.missingCostRowCount > 0 && <sup className="monthly-category-cost-flag" title="Gross profit has missing purchase cost">*</sup>}</td>
          </tr></tfoot>
        </table>
      </div>
      <footer className="category-sales__footer"><span>{source.sourceFileCount} normalized source {source.sourceFileCount === 1 ? 'file' : 'files'}</span><span><AlertCircleIcon size={13} /> Duplicate and non-finalized transactions excluded</span></footer>
    </section>
    </>}
  </div>;
}

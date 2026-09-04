import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircleIcon, SearchIcon } from '@/components/icons';
import { Alert, Badge, LoadingState, Select, TextInput } from '@/components/ui';
import { useBranches, useEntities } from '@/hooks';
import { financialYearFor, loadDailySalesCategorySource } from './dailySalesCategoryReport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';
import { ReportDatePicker } from './ReportDatePicker';
import {
  calculateStyleSalesPurchaseAnalysis,
  summarizeStyleSalesPurchaseRows,
} from './styleSalesPurchaseAnalysis';
import type {
  StyleSalesPurchaseRow,
  StyleSalesPurchaseStatus,
} from './styleSalesPurchaseAnalysis';
import './DailySalesCategoryDashboard.css';
import './StyleSalesPurchaseAnalysisDashboard.css';

type SortKey = keyof StyleSalesPurchaseRow;
type SortDirection = 'ascending' | 'descending';
type StatusFilter = 'all' | StyleSalesPurchaseStatus;

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
const PERCENT_FORMATTER = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'Fully Sold', label: 'Fully Sold' },
  { value: 'Partially Sold', label: 'Partially Sold' },
  { value: 'Not Sold', label: 'Not Sold' },
  { value: 'Negative Stock', label: 'Negative Stock' },
  { value: 'Missing Purchase Data', label: 'Missing Purchase Data' },
  { value: 'No Activity', label: 'No Activity' },
];

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.valueOf() - offset).toISOString().slice(0, 10);
}

function latestTransactionDate(source: DailySalesCategorySource): string | null {
  return [...source.sales, ...source.purchases].reduce<string | null>((latest, row) => (
    row.invoiceDate && (!latest || row.invoiceDate > latest) ? row.invoiceDate : latest
  ), null);
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

function formatPercent(value: number): string {
  return `${PERCENT_FORMATTER.format(value)}%`;
}

function statusClassName(status: StyleSalesPurchaseStatus): string {
  return `style-purchase-status style-purchase-status--${status.toLocaleLowerCase().replace(/\s+/g, '-')}`;
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

export function StyleSalesPurchaseAnalysisDashboard() {
  const { selectedEntity } = useEntities();
  const { status: branchStatus, selectableBranches, selectedBranch } = useBranches();
  const selectedEntityId = selectedEntity?.id ?? null;
  const scopeId = selectedEntityId && branchStatus === 'ready'
    ? selectableBranches.length === 0 ? selectedEntityId : selectedBranch ? `${selectedEntityId}:branch:${selectedBranch.id}` : null
    : null;
  const requestRef = useRef(0);
  const [loadState, setLoadState] = useState<ReportLoadState | null>(null);
  const [fromDate, setFromDate] = useState(() => financialYearFor(todayIso()).start);
  const [toDate, setToDate] = useState(todayIso);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortColumn, setSortColumn] = useState<SortKey>('style');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!scopeId || !selectedEntity) return;
    void loadDailySalesCategorySource(scopeId, { entity: selectedEntity, branch: selectedBranch })
      .then((loaded) => {
        if (requestRef.current !== requestId) return;
        const periodEnd = latestTransactionDate(loaded) ?? todayIso();
        setLoadState({ scopeId, source: loaded, error: null });
        setToDate(periodEnd);
        setFromDate(financialYearFor(periodEnd).start);
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: null, error: 'The normalized Sales and Purchase data could not be read from this browser.' });
      });
  }, [scopeId, selectedBranch, selectedEntity]);

  const source = loadState?.scopeId === scopeId ? loadState.source : null;
  const loadError = loadState?.scopeId === scopeId ? loadState.error : null;
  const result = useMemo(
    () => source ? calculateStyleSalesPurchaseAnalysis(source, fromDate, toDate) : null,
    [fromDate, source, toDate],
  );
  const visibleRows = useMemo(() => {
    if (!result) return [];
    const term = deferredQuery.trim().toLocaleLowerCase();
    const filteredRows = result.rows.filter((row) => (
      (!term || row.style.toLocaleLowerCase().includes(term) || row.product.toLocaleLowerCase().includes(term))
      && (statusFilter === 'all' || row.status === statusFilter)
    ));
    return [...filteredRows].sort((left, right) => {
      const leftValue = left[sortColumn];
      const rightValue = right[sortColumn];
      const comparison = typeof leftValue === 'string' && typeof rightValue === 'string'
        ? leftValue.localeCompare(rightValue)
        : Number(leftValue) - Number(rightValue);
      return sortDirection === 'ascending' ? comparison : -comparison;
    });
  }, [deferredQuery, result, sortColumn, sortDirection, statusFilter]);
  const visibleTotals = useMemo(() => summarizeStyleSalesPurchaseRows(visibleRows), [visibleRows]);

  const handleSort = (column: SortKey) => {
    if (column === sortColumn) {
      setSortDirection((current) => current === 'ascending' ? 'descending' : 'ascending');
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'style' || column === 'product' || column === 'status' ? 'ascending' : 'descending');
  };
  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    if (value > toDate) setToDate(value);
  };
  const handleToDateChange = (value: string) => {
    setToDate(value);
    if (value < fromDate) setFromDate(value);
  };

  if (!selectedEntity) return <Alert variant="info" title="Select an entity">Choose an active entity from the top bar to view this report.</Alert>;
  if (branchStatus === 'loading' || (scopeId && loadState?.scopeId !== scopeId)) return <LoadingState message="Preparing sales against purchase analysis…" />;
  if (branchStatus === 'error') return <Alert variant="danger" title="Branch unavailable">The active branch could not be loaded. Retry from the branch selector.</Alert>;
  if (!scopeId) return <Alert variant="info" title="Select a branch">Choose an active branch from the top bar to view this report.</Alert>;
  if (loadError) return <Alert variant="danger" title="Report unavailable">{loadError}</Alert>;
  if (!result || !source) return <LoadingState message="Preparing sales against purchase analysis…" />;

  const unmappedCount = result.unmappedStyleRecordCount + result.unmappedProductRecordCount;

  return <div className="style-purchase-analysis-dashboard">
    {unmappedCount > 0 && <Alert variant="warning" title="Data-quality warning">
      {result.unmappedStyleRecordCount > 0 && <span>{result.unmappedStyleRecordCount} {result.unmappedStyleRecordCount === 1 ? 'transaction has' : 'transactions have'} no mapped Style. </span>}
      {result.unmappedProductRecordCount > 0 && <span>{result.unmappedProductRecordCount} {result.unmappedProductRecordCount === 1 ? 'transaction has' : 'transactions have'} no mapped Product.</span>}
    </Alert>}

    <section className="category-sales style-purchase-analysis" aria-labelledby="style-purchase-analysis-title">
      <header className="category-sales__header style-purchase-analysis__header">
        <div className="style-purchase-analysis__heading">
          <span className="sales-kpi-section__eyebrow">Style + Product</span>
          <h2 id="style-purchase-analysis-title">Sales against purchase analysis</h2>
          <p>Purchase, sales and remaining stock cost for {formatDate(fromDate)} – {formatDate(toDate)}.</p>
        </div>
        <div className="style-purchase-analysis__filters" aria-label="Report filters">
          <label className="style-purchase-analysis__search" htmlFor="style-purchase-search">
            <span>Search</span>
            <TextInput id="style-purchase-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leadingIcon={<SearchIcon size={16} />} placeholder="Style / Product" />
          </label>
          <div className="style-purchase-analysis__date"><span>From Date</span><ReportDatePicker id="style-purchase-from-date" value={fromDate} onChange={handleFromDateChange} label="From Date" /></div>
          <div className="style-purchase-analysis__date"><span>To Date</span><ReportDatePicker id="style-purchase-to-date" value={toDate} onChange={handleToDateChange} label="To Date" /></div>
          <label className="style-purchase-analysis__status" htmlFor="style-purchase-status-filter">
            <span>Status</span>
            <Select id="style-purchase-status-filter" value={statusFilter} options={STATUS_OPTIONS} onValueChange={setStatusFilter} />
          </label>
          <Badge tone="neutral">{visibleRows.length} of {result.rows.length}</Badge>
        </div>
      </header>

      <div className="category-sales-table-wrap style-purchase-analysis__table-wrap">
        <table className="category-sales-table style-purchase-table">
          <caption className="sr-only">Style-wise sales against purchase analysis for the selected period</caption>
          <thead><tr>
            <SortHeader label="Style" column="style" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Product" column="product" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Total Purchase Qty" column="totalPurchaseQty" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Total Purchase Value (Rs.)" column="totalPurchaseValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Total Sales Qty" column="totalSalesQty" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Total Sales Value (Rs.)" column="totalSalesValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Balance Unsold Qty" column="balanceUnsoldQty" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Balance Purchase Value" column="balancePurchaseValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Status" column="status" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Percentage" column="percentage" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
          </tr></thead>
          <tbody>{visibleRows.length > 0 ? visibleRows.map((row) => <tr key={`${row.style}\u0000${row.product}`}>
            <th scope="row">{row.style}</th>
            <th scope="row">{row.product}</th>
            <td>{formatQuantity(row.totalPurchaseQty)}</td>
            <td>{formatCurrency(row.totalPurchaseValue)}</td>
            <td>{formatQuantity(row.totalSalesQty)}</td>
            <td>{formatCurrency(row.totalSalesValue)}</td>
            <td className={row.balanceUnsoldQty < 0 ? 'category-sales-table__negative' : undefined}>{formatQuantity(row.balanceUnsoldQty)}</td>
            <td className={row.balancePurchaseValue < 0 ? 'category-sales-table__negative' : undefined}>{formatCurrency(row.balancePurchaseValue)}</td>
            <td className="style-purchase-table__status"><span className={statusClassName(row.status)}>{row.status}</span></td>
            <td>{formatPercent(row.percentage)}</td>
          </tr>) : <tr><td className="category-sales-table__empty" colSpan={10}>{query || statusFilter !== 'all' ? 'No Style and Product rows match the selected filters.' : 'No Sales or Purchase data is available for the selected period.'}</td></tr>}</tbody>
          <tfoot><tr>
            <th scope="row">TOTAL</th><th aria-label="Product total"></th>
            <td>{formatQuantity(visibleTotals.totalPurchaseQty)}</td>
            <td>{formatCurrency(visibleTotals.totalPurchaseValue)}</td>
            <td>{formatQuantity(visibleTotals.totalSalesQty)}</td>
            <td>{formatCurrency(visibleTotals.totalSalesValue)}</td>
            <td className={visibleTotals.balanceUnsoldQty < 0 ? 'category-sales-table__negative' : undefined}>{formatQuantity(visibleTotals.balanceUnsoldQty)}</td>
            <td className={visibleTotals.balancePurchaseValue < 0 ? 'category-sales-table__negative' : undefined}>{formatCurrency(visibleTotals.balancePurchaseValue)}</td>
            <td className="style-purchase-table__status" aria-label="Status total">—</td>
            <td>{formatPercent(visibleTotals.percentage)}</td>
          </tr></tfoot>
        </table>
      </div>
      <footer className="category-sales__footer">
        <span>{source.sourceFileCount} normalized source {source.sourceFileCount === 1 ? 'file' : 'files'}</span>
        <span><AlertCircleIcon size={13} /> Duplicate and non-finalized transactions excluded</span>
      </footer>
    </section>
  </div>;
}

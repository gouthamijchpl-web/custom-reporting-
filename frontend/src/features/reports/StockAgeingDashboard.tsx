import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircleIcon, SearchIcon } from '@/components/icons';
import { Alert, Badge, Button, LoadingState, Select, TextInput } from '@/components/ui';
import { useBranches, useEntities } from '@/hooks';
import { loadDailySalesCategorySource } from './dailySalesCategoryReport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';
import { ReportDatePicker } from './ReportDatePicker';
import { stockAgeingReportFor, summarizeStockAgeingRows } from './stockAgeingReport';
import type {
  StockAgeingBucketKey,
  StockAgeingRow,
} from './stockAgeingReport';
import './DailySalesCategoryDashboard.css';
import './StockAgeingDashboard.css';

type SortKey = 'skuNumber' | 'itemDescription' | 'style' | 'productType' | StockAgeingBucketKey;
type SortDirection = 'ascending' | 'descending';
type BucketFilter = 'all' | StockAgeingBucketKey;

interface ReportLoadState {
  scopeId: string;
  source: DailySalesCategorySource | null;
  error: string | null;
}

const QUANTITY_FORMATTER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const PAGE_SIZE = 200;
const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const BUCKET_OPTIONS: ReadonlyArray<{ value: BucketFilter; label: string }> = [
  { value: 'all', label: 'All Ageing Buckets' },
  { value: 'lessThan30', label: 'Less than 30 Days' },
  { value: 'days30To60', label: '30 to 60 Days' },
  { value: 'days60To90', label: '60 to 90 Days' },
  { value: 'days90To120', label: '90 to 120 Days' },
  { value: 'days120To180', label: '120 to 180 Days' },
  { value: 'moreThan180', label: 'More than 180 Days' },
];

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.valueOf() - offset).toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`));
}

function formatQuantity(value: number): string {
  return QUANTITY_FORMATTER.format(value);
}

function latestTransactionDate(source: DailySalesCategorySource): string | null {
  return [...source.sales, ...source.purchases, ...(source.openingStock ?? [])].reduce<string | null>((latest, row) => (
    row.invoiceDate && (!latest || row.invoiceDate > latest) ? row.invoiceDate : latest
  ), null);
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

function sortableValue(row: StockAgeingRow, column: SortKey): string | number {
  return row[column];
}

export function StockAgeingDashboard() {
  const { selectedEntity } = useEntities();
  const { status: branchStatus, selectableBranches, selectedBranch } = useBranches();
  const selectedEntityId = selectedEntity?.id ?? null;
  const scopeId = selectedEntityId && branchStatus === 'ready'
    ? selectableBranches.length === 0 ? selectedEntityId : selectedBranch ? `${selectedEntityId}:branch:${selectedBranch.id}` : null
    : null;
  const requestRef = useRef(0);
  const [loadState, setLoadState] = useState<ReportLoadState | null>(null);
  const [asOnDate, setAsOnDate] = useState(todayIso);
  const deferredAsOnDate = useDeferredValue(asOnDate);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [productFilter, setProductFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [sortColumn, setSortColumn] = useState<SortKey>('skuNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!scopeId || !selectedEntity) return;
    void loadDailySalesCategorySource(scopeId, { entity: selectedEntity, branch: selectedBranch })
      .then((loaded) => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: loaded, error: null });
        setAsOnDate(latestTransactionDate(loaded) ?? todayIso());
        setQuery('');
        setProductFilter('all');
        setStyleFilter('all');
        setBucketFilter('all');
        setPageIndex(0);
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: null, error: 'The normalized Sales and Purchase data could not be read from this browser.' });
      });
  }, [scopeId, selectedBranch, selectedEntity]);

  const source = loadState?.scopeId === scopeId ? loadState.source : null;
  const loadError = loadState?.scopeId === scopeId ? loadState.error : null;
  const result = useMemo(
    () => source && deferredAsOnDate ? stockAgeingReportFor(source, deferredAsOnDate) : null,
    [deferredAsOnDate, source],
  );
  const productOptions = useMemo(() => [
    { value: 'all', label: 'All Product Types' },
    ...[...new Set(result?.rows.map((row) => row.productType) ?? [])]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value })),
  ], [result]);
  const styleOptions = useMemo(() => [
    { value: 'all', label: 'All Styles' },
    ...[...new Set(result?.rows.map((row) => row.style) ?? [])]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value })),
  ], [result]);
  const visibleRows = useMemo(() => {
    if (!result) return [];
    const term = deferredQuery.trim().toLocaleLowerCase();
    const filtered = result.rows.filter((row) => (
      (productFilter === 'all' || row.productType === productFilter)
      && (styleFilter === 'all' || row.style === styleFilter)
      && (bucketFilter === 'all' || row[bucketFilter] > 0)
      && (!term || [row.skuNumber, row.itemDescription, row.style, row.productType]
        .some((value) => value.toLocaleLowerCase().includes(term)))
    ));
    return [...filtered].sort((left, right) => {
      const leftValue = sortableValue(left, sortColumn);
      const rightValue = sortableValue(right, sortColumn);
      const comparison = typeof leftValue === 'string' && typeof rightValue === 'string'
        ? leftValue.localeCompare(rightValue)
        : Number(leftValue) - Number(rightValue);
      const stableComparison = comparison || left.skuNumber.localeCompare(right.skuNumber)
        || left.itemDescription.localeCompare(right.itemDescription)
        || left.style.localeCompare(right.style) || left.productType.localeCompare(right.productType);
      return sortDirection === 'ascending' ? stableComparison : -stableComparison;
    });
  }, [bucketFilter, deferredQuery, productFilter, result, sortColumn, sortDirection, styleFilter]);
  const visibleTotals = useMemo(() => summarizeStockAgeingRows(visibleRows), [visibleRows]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const displayedRows = visibleRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const resetPage = () => setPageIndex(0);
  const handleSort = (column: SortKey) => {
    resetPage();
    if (column === sortColumn) {
      setSortDirection((current) => current === 'ascending' ? 'descending' : 'ascending');
      return;
    }
    setSortColumn(column);
    setSortDirection(['skuNumber', 'itemDescription', 'style', 'productType'].includes(column) ? 'ascending' : 'descending');
  };

  if (!selectedEntity) return <Alert variant="info" title="Select an entity">Choose an active entity from the top bar to view this report.</Alert>;
  if (branchStatus === 'loading' || (scopeId && loadState?.scopeId !== scopeId)) return <LoadingState message="Preparing stock ageing report…" />;
  if (branchStatus === 'error') return <Alert variant="danger" title="Branch unavailable">The active branch could not be loaded. Retry from the branch selector.</Alert>;
  if (!scopeId) return <Alert variant="info" title="Select a branch">Choose an active branch from the top bar to view this report.</Alert>;
  if (loadError) return <Alert variant="danger" title="Report unavailable">{loadError}</Alert>;
  if (!result || !source) return <LoadingState message="Preparing stock ageing report…" />;

  const summaryCards: Array<{ label: string; value: number; className?: string }> = [
    { label: 'Total Stock Qty', value: visibleTotals.totalStock },
    { label: '<30 Days', value: visibleTotals.lessThan30 },
    { label: '30–60 Days', value: visibleTotals.days30To60 },
    { label: '60–90 Days', value: visibleTotals.days60To90, className: 'stock-ageing-summary__card--watch' },
    { label: '90–120 Days', value: visibleTotals.days90To120, className: 'stock-ageing-summary__card--watch' },
    { label: '120–180 Days', value: visibleTotals.days120To180, className: 'stock-ageing-summary__card--warning' },
    { label: '>180 Days', value: visibleTotals.moreThan180, className: 'stock-ageing-summary__card--aged' },
  ];

  return <div className="stock-ageing-dashboard" aria-busy={asOnDate !== deferredAsOnDate}>
    {result.negativeStockSkuCount > 0 && <Alert variant="warning" title="Data status: Negative Stock / Missing Purchase History">
      {result.negativeStockSkuCount} {result.negativeStockSkuCount === 1 ? 'SKU has' : 'SKUs have'} sales or reductions exceeding traceable inward stock ({formatQuantity(result.negativeStockQuantity)} qty). This quantity is not placed into an ageing bucket.
    </Alert>}
    {result.unagedReturnSkuCount > 0 && <Alert variant="warning" title="Data status: Stock age unavailable">
      {formatQuantity(result.unagedReturnQuantity)} returned qty across {result.unagedReturnSkuCount} {result.unagedReturnSkuCount === 1 ? 'SKU has' : 'SKUs have'} no traceable purchase-origin date and is excluded from ageing buckets.
    </Alert>}
    {result.unknownOpeningStockSkuCount > 0 && <Alert variant="warning" title="Data status: Opening Stock Age Unknown">
      {formatQuantity(result.unknownOpeningStockQuantity)} remaining opening qty across {result.unknownOpeningStockSkuCount} {result.unknownOpeningStockSkuCount === 1 ? 'SKU has' : 'SKUs have'} no historical stock-origin date. It participates in FIFO depletion but is not assigned to an ageing bucket.
    </Alert>}
    {(result.unmappedProductCount > 0 || result.unmappedStyleCount > 0) && <Alert variant="warning" title="Data-quality warning">
      {result.unmappedProductCount > 0 && <span>{result.unmappedProductCount} {result.unmappedProductCount === 1 ? 'row uses' : 'rows use'} Unmapped Product. </span>}
      {result.unmappedStyleCount > 0 && <span>{result.unmappedStyleCount} {result.unmappedStyleCount === 1 ? 'row uses' : 'rows use'} Unmapped Style.</span>}
    </Alert>}
    {Math.abs(result.reconciliationDifference) > 0.0001 && <Alert variant="danger" title="Reconciliation warning">Ageing buckets do not reconcile with identifiable remaining purchase lots.</Alert>}

    <section className="stock-ageing-summary" aria-label="Stock ageing summary">
      <div className="stock-ageing-summary__heading">
        <span className="sales-kpi-section__eyebrow">Stock position</span>
        <h2>Ageing summary</h2>
        <p>Unsold quantity as of {formatDate(result.asOnDate)}</p>
      </div>
      <div className="stock-ageing-summary__cards">
        {summaryCards.map((card) => <article key={card.label} className={`stock-ageing-summary__card ${card.className ?? ''}`.trim()}>
          <span>{card.label}</span><strong>{formatQuantity(card.value)}</strong>
        </article>)}
      </div>
    </section>

    <section className="category-sales stock-ageing" aria-labelledby="stock-ageing-title">
      <header className="category-sales__header stock-ageing__header">
        <div className="stock-ageing__heading">
          <span className="sales-kpi-section__eyebrow">SKU + FIFO ageing</span>
          <h2 id="stock-ageing-title">Current unsold stock</h2>
          <p>Purchase lots are depleted oldest-first using finalized Sales quantity.</p>
        </div>
        <div className="stock-ageing__filters" aria-label="Stock ageing filters">
          <label className="stock-ageing__date" htmlFor="stock-ageing-as-on-date"><span>Stock Ageing As On Date</span><ReportDatePicker id="stock-ageing-as-on-date" value={asOnDate} onChange={(value) => { setAsOnDate(value); resetPage(); }} label="Stock Ageing As On Date" /></label>
          <label className="stock-ageing__search" htmlFor="stock-ageing-search"><span>Search</span><TextInput id="stock-ageing-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} leadingIcon={<SearchIcon size={16} />} placeholder="SKU / Description / Style / Product" /></label>
          <label htmlFor="stock-ageing-product"><span>Product Type</span><Select id="stock-ageing-product" value={productFilter} options={productOptions} onValueChange={(value) => { setProductFilter(value); resetPage(); }} /></label>
          <label htmlFor="stock-ageing-style"><span>Style</span><Select id="stock-ageing-style" value={styleFilter} options={styleOptions} onValueChange={(value) => { setStyleFilter(value); resetPage(); }} /></label>
          <label htmlFor="stock-ageing-bucket"><span>Ageing Bucket</span><Select id="stock-ageing-bucket" value={bucketFilter} options={BUCKET_OPTIONS} onValueChange={(value) => { setBucketFilter(value); resetPage(); }} /></label>
          <Badge tone="neutral">{visibleRows.length} of {result.rows.length}</Badge>
        </div>
      </header>

      <div className="category-sales-table-wrap stock-ageing__table-wrap">
        <table className="category-sales-table stock-ageing-table">
          <caption className="sr-only">Stock ageing of current unsold inventory using FIFO allocation</caption>
          <thead><tr>
            <SortHeader label="SKU Number" column="skuNumber" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Item Description" column="itemDescription" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Style" column="style" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Product Type" column="productType" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Less than 30 Days" column="lessThan30" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="30 to 60 Days" column="days30To60" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="60 to 90 Days" column="days60To90" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="90 to 120 Days" column="days90To120" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="120 to 180 Days" column="days120To180" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="More than 180 Days" column="moreThan180" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
          </tr></thead>
          <tbody>{displayedRows.length > 0 ? displayedRows.map((row) => <tr key={[row.skuNumber, row.style, row.productType].join('\u0000')} className={row.hasDataWarning ? 'stock-ageing-table__warning-row' : undefined} title={row.warningText || undefined}>
            <th scope="row"><span>{row.skuNumber}</span>{row.hasDataWarning && <AlertCircleIcon size={13} aria-label={row.warningText} />}</th>
            <td title={row.itemDescription}>{row.itemDescription}</td>
            <td>{row.style}</td>
            <td>{row.productType}</td>
            <td>{formatQuantity(row.lessThan30)}</td>
            <td>{formatQuantity(row.days30To60)}</td>
            <td className="stock-ageing-table__watch">{formatQuantity(row.days60To90)}</td>
            <td className="stock-ageing-table__watch">{formatQuantity(row.days90To120)}</td>
            <td className="stock-ageing-table__warning">{formatQuantity(row.days120To180)}</td>
            <td className={row.moreThan180 > 0 ? 'stock-ageing-table__aged' : undefined}>{formatQuantity(row.moreThan180)}</td>
          </tr>) : <tr><td className="category-sales-table__empty" colSpan={10}>{result.totals.totalStock === 0 ? 'No remaining stock found as of this date.' : 'No stock ageing rows match the selected filters.'}</td></tr>}</tbody>
          <tfoot><tr>
            <th scope="row">TOTAL</th>
            <td aria-label="Item Description total"></td>
            <td aria-label="Style total"></td>
            <td aria-label="Product Type total"></td>
            <td>{formatQuantity(visibleTotals.lessThan30)}</td>
            <td>{formatQuantity(visibleTotals.days30To60)}</td>
            <td>{formatQuantity(visibleTotals.days60To90)}</td>
            <td>{formatQuantity(visibleTotals.days90To120)}</td>
            <td>{formatQuantity(visibleTotals.days120To180)}</td>
            <td className={visibleTotals.moreThan180 > 0 ? 'stock-ageing-table__aged' : undefined}>{formatQuantity(visibleTotals.moreThan180)}</td>
          </tr></tfoot>
        </table>
      </div>
      <footer className="category-sales__footer stock-ageing__footer">
        <span>{source.sourceFileCount + (source.openingStockFileCount ?? 0)} normalized stock source {source.sourceFileCount + (source.openingStockFileCount ?? 0) === 1 ? 'file' : 'files'}</span>
        {visibleRows.length > 0 && <div className="stock-ageing__pagination" aria-label="Stock ageing table pages">
          <span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, visibleRows.length)} of {visibleRows.length}</span>
          <Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPageIndex((page) => Math.max(0, page - 1))}>Previous</Button>
          <Button variant="ghost" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPageIndex((page) => Math.min(pageCount - 1, page + 1))}>Next</Button>
        </div>}
        <span><AlertCircleIcon size={13} /> Duplicate and non-finalized transactions excluded</span>
      </footer>
    </section>
  </div>;
}

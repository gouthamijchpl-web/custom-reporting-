import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircleIcon, CheckCircleIcon, LayersIcon, ReportsIcon, SearchIcon } from '@/components/icons';
import { Alert, Badge, LoadingState, TextInput } from '@/components/ui';
import { useBranches, useEntities } from '@/hooks';
import { loadDailySalesCategorySource } from './dailySalesCategoryReport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';
import { calculateDailySalesStyleReport } from './dailySalesStyleReport';
import type { DailySalesStyleRow } from './dailySalesStyleReport';
import { ReportDatePicker } from './ReportDatePicker';
import './DailySalesCategoryDashboard.css';
import './DailySalesStyleDashboard.css';

type SortKey = keyof DailySalesStyleRow;
type SortDirection = 'ascending' | 'descending';

interface ReportLoadState {
  scopeId: string;
  source: DailySalesCategorySource | null;
  error: string | null;
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  negative?: boolean;
  detail?: string;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const QUANTITY_FORMATTER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.valueOf() - offset).toISOString().slice(0, 10);
}

function formatDate(value: string): string { return DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`)); }
function formatCurrency(value: number): string { return CURRENCY_FORMATTER.format(value); }
function formatQuantity(value: number): string { return QUANTITY_FORMATTER.format(value); }
function formatPercent(value: number): string { return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)}%`; }

function KpiCard({ label, value, icon, negative = false, detail }: KpiCardProps) {
  return <article className={`sales-kpi${negative ? ' sales-kpi--negative' : ''}`}>
    <span className="sales-kpi__icon">{icon}</span>
    <div><p>{label}</p><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
  </article>;
}

function SortHeader({ label, column, activeColumn, direction, onSort }: {
  label: string;
  column: SortKey;
  activeColumn: SortKey;
  direction: SortDirection;
  onSort: (column: SortKey) => void;
}) {
  const active = column === activeColumn;
  return <th scope="col"><button type="button" className="category-sales-table__sort" onClick={() => onSort(column)} aria-sort={active ? direction : 'none'}>{label}<span aria-hidden="true">{active ? direction === 'ascending' ? '↑' : '↓' : '↕'}</span></button></th>;
}

export function DailySalesStyleDashboard() {
  const { selectedEntity } = useEntities();
  const { status: branchStatus, selectableBranches, selectedBranch } = useBranches();
  const selectedEntityId = selectedEntity?.id ?? null;
  const scopeId = selectedEntityId && branchStatus === 'ready'
    ? selectableBranches.length === 0 ? selectedEntityId : selectedBranch ? `${selectedEntityId}:branch:${selectedBranch.id}` : null
    : null;
  const requestRef = useRef(0);
  const [loadState, setLoadState] = useState<ReportLoadState | null>(null);
  const [reportDate, setReportDate] = useState(todayIso);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sortColumn, setSortColumn] = useState<SortKey>('style');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!scopeId || !selectedEntity) return;
    void loadDailySalesCategorySource(scopeId, { entity: selectedEntity, branch: selectedBranch })
      .then((loaded) => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: loaded, error: null });
        setReportDate(loaded.latestSalesDate ?? todayIso());
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: null, error: 'The normalized Sales and Purchase data could not be read from this browser.' });
      });
  }, [scopeId, selectedBranch, selectedEntity]);

  const source = loadState?.scopeId === scopeId ? loadState.source : null;
  const loadError = loadState?.scopeId === scopeId ? loadState.error : null;
  const result = useMemo(() => source && reportDate ? calculateDailySalesStyleReport(source, reportDate) : null, [reportDate, source]);
  const visibleRows = useMemo(() => {
    if (!result) return [];
    const term = deferredQuery.trim().toLocaleLowerCase();
    const rows = result.rows.filter((row) => !term || row.style.toLocaleLowerCase().includes(term) || row.product.toLocaleLowerCase().includes(term));
    return [...rows].sort((left, right) => {
      const leftValue = left[sortColumn];
      const rightValue = right[sortColumn];
      const comparison = typeof leftValue === 'string' && typeof rightValue === 'string'
        ? leftValue.localeCompare(rightValue)
        : Number(leftValue) - Number(rightValue);
      return sortDirection === 'ascending' ? comparison : -comparison;
    });
  }, [deferredQuery, result, sortColumn, sortDirection]);

  const handleSort = (column: SortKey) => {
    if (column === sortColumn) {
      setSortDirection((current) => current === 'ascending' ? 'descending' : 'ascending');
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'style' || column === 'product' ? 'ascending' : 'descending');
  };

  if (!selectedEntity) return <Alert variant="info" title="Select an entity">Choose an active entity from the top bar to view this report.</Alert>;
  if (branchStatus === 'loading' || (scopeId && loadState?.scopeId !== scopeId)) return <LoadingState message="Preparing style-wise sales report…" />;
  if (branchStatus === 'error') return <Alert variant="danger" title="Branch unavailable">The active branch could not be loaded. Retry from the branch selector.</Alert>;
  if (!scopeId) return <Alert variant="info" title="Select a branch">Choose an active branch from the top bar to view this report.</Alert>;
  if (loadError) return <Alert variant="danger" title="Report unavailable">{loadError}</Alert>;
  if (!result || !source) return <LoadingState message="Preparing style-wise sales report…" />;

  const totals = result.totals;
  const dailyKpis: KpiCardProps[] = [
    { label: 'DAILY SALES QTY', value: formatQuantity(totals.dailySalesQty), icon: <LayersIcon size={18} /> },
    { label: 'DAILY SALES VALUE', value: formatCurrency(totals.dailySalesValue), icon: <span>₹</span> },
    { label: 'DAILY PURCHASE VALUE', value: formatCurrency(totals.dailyPurchaseValue), icon: <ReportsIcon size={18} />, detail: 'COGS of items sold' },
    { label: 'DAILY GROSS PROFIT', value: formatCurrency(totals.dailyGrossProfit), icon: <CheckCircleIcon size={18} />, negative: totals.dailyGrossProfit < 0 },
    { label: 'DAILY GM %', value: formatPercent(totals.dailyGmPercent), icon: <ReportsIcon size={18} />, negative: totals.dailyGmPercent < 0 },
  ];
  const ytdKpis: KpiCardProps[] = [
    { label: 'YTD SALES QTY', value: formatQuantity(totals.ytdSalesQty), icon: <LayersIcon size={18} /> },
    { label: 'YTD TAXABLE VALUE', value: formatCurrency(totals.ytdTaxableValue), icon: <span>₹</span> },
    { label: 'YTD PURCHASE VALUE', value: formatCurrency(totals.ytdPurchaseValue), icon: <ReportsIcon size={18} />, detail: 'COGS of items sold' },
    { label: 'YTD GROSS PROFIT', value: formatCurrency(totals.ytdGrossProfit), icon: <CheckCircleIcon size={18} />, negative: totals.ytdGrossProfit < 0 },
    { label: 'YTD GM %', value: formatPercent(totals.ytdGmPercent), icon: <ReportsIcon size={18} />, negative: totals.ytdGmPercent < 0 },
    { label: `INWARD PURCHASE (${result.financialYearLabel} VALUE)`, value: formatCurrency(totals.inwardPurchaseValue), icon: <LayersIcon size={18} /> },
  ];
  const hasQualityIssue = result.missingCostRowCount > 0 || result.unmappedStyleRowCount > 0;
  const healthLabel = [
    result.missingCostRowCount ? `${result.missingCostRowCount} missing cost` : '',
    result.unmappedStyleRowCount ? `${result.unmappedStyleRowCount} unmapped style` : '',
  ].filter(Boolean).join(' · ') || 'Complete';

  return <div className="daily-sales-dashboard daily-sales-style-dashboard">
    <section className="sales-report-context style-sales-report-context" aria-label="Report period">
      <div className="sales-report-date"><span>Report Date</span><ReportDatePicker id="daily-style-sales-report-date" value={reportDate} onChange={setReportDate} /></div>
      <div className="sales-report-period"><Badge tone="accent">{result.financialYearLabel}</Badge><span>{formatDate(result.financialYearStart)} <span aria-hidden="true">→</span> {formatDate(result.reportDate)}</span></div>
      <div className={`style-report-health${hasQualityIssue ? ' style-report-health--warning' : ''}`}>
        {hasQualityIssue ? <AlertCircleIcon size={16} /> : <CheckCircleIcon size={16} />}<span>Data Status</span><strong>{healthLabel}</strong>
      </div>
    </section>

    {hasQualityIssue && <Alert variant="warning" title="Report data needs attention">
      {result.missingCostRowCount > 0 && <span>{result.missingCostRowCount} sales {result.missingCostRowCount === 1 ? 'transaction has' : 'transactions have'} no matched purchase cost ({formatCurrency(result.missingCostSalesValue)} sales value). </span>}
      {result.unmappedStyleRowCount > 0 && <span>{result.unmappedStyleRowCount} sales {result.unmappedStyleRowCount === 1 ? 'transaction is' : 'transactions are'} grouped under Unmapped Style ({formatCurrency(result.unmappedStyleSalesValue)} sales value).</span>}
    </Alert>}
    {totals.dailySalesQty === 0 && <Alert variant="info">No sales transactions were found for {formatDate(reportDate)}. Financial-year metrics are still shown through the selected date.</Alert>}

    <section className="sales-kpi-section" aria-labelledby="style-daily-kpi-title">
      <header><div><span className="sales-kpi-section__eyebrow">Selected date</span><h2 id="style-daily-kpi-title">Daily performance</h2></div><span>{formatDate(reportDate)}</span></header>
      <div className="sales-kpi-grid sales-kpi-grid--daily">{dailyKpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}</div>
    </section>
    <section className="sales-kpi-section" aria-labelledby="style-ytd-kpi-title">
      <header><div><span className="sales-kpi-section__eyebrow">Financial year to date</span><h2 id="style-ytd-kpi-title">{result.financialYearLabel} performance</h2></div><span>{formatDate(result.financialYearStart)} – {formatDate(result.reportDate)}</span></header>
      <div className="sales-kpi-grid sales-kpi-grid--ytd">{ytdKpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}</div>
    </section>

    <section className="category-sales style-sales" aria-labelledby="style-sales-title">
      <header className="category-sales__header">
        <div><span className="sales-kpi-section__eyebrow">Style + Product</span><h2 id="style-sales-title">Style-wise breakdown</h2><p>Each mapped Style and Product combination is reported separately.</p></div>
        <div className="category-sales__tools"><TextInput id="style-sales-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leadingIcon={<SearchIcon size={16} />} placeholder="Search style / product" aria-label="Search style or product" /><Badge tone="neutral">{visibleRows.length} of {result.rows.length}</Badge></div>
      </header>
      <div className="category-sales-table-wrap">
        <table className="category-sales-table style-sales-table">
          <caption className="sr-only">Daily and financial-year sales performance grouped by Style and Product</caption>
          <thead>
          <tr className="style-sales-table__group-row">
            <th scope="colgroup" colSpan={7}><strong>DAILY BREAKDOWN</strong><span>Selected Date — {formatDate(result.reportDate)}</span></th>
            <th scope="colgroup" colSpan={7}><strong>FINANCIAL YEAR TO DATE</strong><span>{formatDate(result.financialYearStart)} – {formatDate(result.reportDate)}</span></th>
          </tr>
          <tr className="style-sales-table__column-row">
            <SortHeader label="Style" column="style" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Product" column="product" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Daily Qty" column="dailySalesQty" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Daily Taxable (₹)" column="dailySalesValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Daily Purch Val (₹)" column="dailyPurchaseValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Daily GP (₹)" column="dailyGrossProfit" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Daily GM %" column="dailyGmPercent" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="YTD Qty" column="ytdSalesQty" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="YTD Taxable (₹)" column="ytdTaxableValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="YTD Purch Val (₹)" column="ytdPurchaseValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="YTD GP (₹)" column="ytdGrossProfit" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="YTD GM %" column="ytdGmPercent" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Inward Purch Qty" column="inwardPurchaseQty" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
            <SortHeader label="Inward Purchase Value (₹)" column="inwardPurchaseValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
          </tr>
          </thead>
          <tbody>{visibleRows.length > 0 ? visibleRows.map((row) => <tr key={`${row.style}\u0000${row.product}`}>
            <th scope="row">{row.style}</th><th scope="row">{row.product}</th>
            <td>{formatQuantity(row.dailySalesQty)}</td><td>{formatCurrency(row.dailySalesValue)}</td><td>{formatCurrency(row.dailyPurchaseValue)}</td>
            <td className={row.dailyGrossProfit < 0 ? 'category-sales-table__negative' : undefined}>{formatCurrency(row.dailyGrossProfit)}</td><td className={row.dailyGmPercent < 0 ? 'category-sales-table__negative' : undefined}>{formatPercent(row.dailyGmPercent)}</td>
            <td>{formatQuantity(row.ytdSalesQty)}</td><td>{formatCurrency(row.ytdTaxableValue)}</td><td>{formatCurrency(row.ytdPurchaseValue)}</td>
            <td className={row.ytdGrossProfit < 0 ? 'category-sales-table__negative' : undefined}>{formatCurrency(row.ytdGrossProfit)}</td><td className={row.ytdGmPercent < 0 ? 'category-sales-table__negative' : undefined}>{formatPercent(row.ytdGmPercent)}</td>
            <td>{formatQuantity(row.inwardPurchaseQty)}</td><td>{formatCurrency(row.inwardPurchaseValue)}</td>
          </tr>) : <tr><td className="category-sales-table__empty" colSpan={14}>{query ? `No Style or Product matches “${query.trim()}”.` : 'No Style-wise data is available for this financial-year period.'}</td></tr>}</tbody>
          <tfoot><tr><th scope="row">TOTAL</th><th aria-label="Product total"></th>
            <td>{formatQuantity(totals.dailySalesQty)}</td><td>{formatCurrency(totals.dailySalesValue)}</td><td>{formatCurrency(totals.dailyPurchaseValue)}</td>
            <td className={totals.dailyGrossProfit < 0 ? 'category-sales-table__negative' : undefined}>{formatCurrency(totals.dailyGrossProfit)}</td><td className={totals.dailyGmPercent < 0 ? 'category-sales-table__negative' : undefined}>{formatPercent(totals.dailyGmPercent)}</td>
            <td>{formatQuantity(totals.ytdSalesQty)}</td><td>{formatCurrency(totals.ytdTaxableValue)}</td><td>{formatCurrency(totals.ytdPurchaseValue)}</td>
            <td className={totals.ytdGrossProfit < 0 ? 'category-sales-table__negative' : undefined}>{formatCurrency(totals.ytdGrossProfit)}</td><td className={totals.ytdGmPercent < 0 ? 'category-sales-table__negative' : undefined}>{formatPercent(totals.ytdGmPercent)}</td>
            <td>{formatQuantity(totals.inwardPurchaseQty)}</td><td>{formatCurrency(totals.inwardPurchaseValue)}</td>
          </tr></tfoot>
        </table>
      </div>
      <footer className="category-sales__footer"><span>{source.sourceFileCount} normalized source {source.sourceFileCount === 1 ? 'file' : 'files'}</span><span>Duplicate and non-finalized transactions excluded</span></footer>
    </section>
  </div>;
}

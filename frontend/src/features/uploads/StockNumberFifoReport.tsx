import { Fragment, useDeferredValue, useMemo, useState } from 'react';
import type { CellObject, Sheet, SheetData } from 'write-excel-file/browser';
import { AlertCircleIcon, ChevronDownIcon, DownloadIcon, SearchIcon } from '@/components/icons';
import { Alert, Badge, Button, Select, TextInput } from '@/components/ui';
import type { ImportedInventoryFile, ImportKind, NormalizedInventoryRecord } from './inventoryImport';
import {
  calculateFifoStockReport,
  summarizeFifoRows,
} from './fifoStockReport';
import type {
  FifoAllocation,
  FifoPurchaseEntry,
  FifoRemainingBatch,
  FifoSaleEntry,
  FifoStockRow,
} from './fifoStockReport';
import './FifoStockReport.css';

type UploadsByType = Partial<Record<ImportKind, ImportedInventoryFile[]>>;
type SortKey = 'stockNumber' | 'product' | 'totalPurchaseQuantity' | 'totalPurchaseValue'
  | 'totalSalesQuantity' | 'totalSalesValue' | 'fifoCogs' | 'grossProfit'
  | 'grossProfitPercent' | 'closingQuantity' | 'closingStockValue';
type SortDirection = 'ascending' | 'descending';
type StatusFilter = 'all' | 'warnings' | 'unmatched' | 'missing-cost' | 'in-stock';

const PAGE_SIZE = 50;
const QUANTITY = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });
const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PERCENTAGE = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

function rowsFor(uploadsByType: UploadsByType, kind: ImportKind): NormalizedInventoryRecord[] {
  return (uploadsByType[kind] ?? []).flatMap((file) => file.normalizedRows);
}

function dateBounds(records: readonly NormalizedInventoryRecord[]): { first: string; last: string } | null {
  const dates = records.flatMap((row) => row.invoiceDate ? [row.invoiceDate] : []).sort();
  return dates.length > 0 ? { first: dates[0], last: dates[dates.length - 1] } : null;
}

function financialYearStart(date: string): number {
  const [year, month] = date.split('-').map(Number);
  return month >= 4 ? year : year - 1;
}

function financialYearLabel(year: number): string {
  return `FY ${year}-${String(year + 1).slice(-2)}`;
}

function financialYearRange(year: number): { from: string; to: string } {
  return { from: `${year}-04-01`, to: `${year + 1}-03-31` };
}

function formatDate(value: string): string {
  if (!value || value === '—') return '—';
  return DATE.format(new Date(`${value}T00:00:00Z`));
}

function formatMoney(value: number | null): string {
  return value == null ? 'N/A' : CURRENCY.format(value);
}

function formatPercent(value: number | null): string {
  return value == null ? 'N/A' : `${PERCENTAGE.format(value)}%`;
}

function formatRateList(values: readonly (number | null)[]): string {
  const rates = [...new Set(values.map((value) => value == null ? 'N/A' : CURRENCY.format(value)))];
  return rates.length > 0 ? rates.join(', ') : '—';
}

function purchaseRates(row: FifoStockRow): string {
  return formatRateList(row.purchases.filter((purchase) => purchase.quantity > 0).map((purchase) => purchase.rate));
}

function salesRates(row: FifoStockRow): string {
  return formatRateList(row.sales.map((sale) => sale.rate));
}

function sortableValue(row: FifoStockRow, key: SortKey): string | number | null {
  return row[key];
}

function SortHeader({ label, column, activeColumn, direction, onSort }: {
  label: string;
  column: SortKey;
  activeColumn: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = column === activeColumn;
  return <th scope="col" aria-sort={active ? direction : 'none'}><button type="button" onClick={() => onSort(column)}>
    {label}<span aria-hidden="true">{active ? direction === 'ascending' ? '↑' : '↓' : '↕'}</span>
  </button></th>;
}

function DetailTable({ title, children, empty, columns }: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
  columns: number;
}) {
  return <section className="fifo-detail-section"><h4>{title}</h4><div className="fifo-detail-table-wrap"><table className="fifo-detail-table">{children}{empty && <tbody><tr><td colSpan={columns}>No records for the selected period.</td></tr></tbody>}</table></div></section>;
}

function PurchaseDetails({ rows }: { rows: readonly FifoPurchaseEntry[] }) {
  return <DetailTable title="A. Purchase History" empty={rows.length === 0} columns={11}>
    <thead><tr><th>Source</th><th>Date</th><th>Invoice / Voucher</th><th>Line</th><th>Qty</th><th>Rate / Unit</th><th>Purchase Value</th><th>FIFO Batch</th><th>Batch Balance</th><th>Period</th><th>Source File</th></tr></thead>
    {rows.length > 0 && <tbody>{rows.map((row) => <tr key={row.id}><td><Badge tone={row.source.includes('Return') ? 'warning' : 'neutral'}>{row.source}</Badge></td><td>{formatDate(row.date)}</td><td>{row.invoiceNumber}</td><td>{row.lineNumber}</td><td>{QUANTITY.format(row.quantity)}</td><td>{formatMoney(row.rate)}</td><td>{formatMoney(row.value)}</td><td>{row.batchLabel}</td><td>{row.remainingQuantity == null ? '—' : QUANTITY.format(row.remainingQuantity)}</td><td>{row.beforePeriod ? 'Before period' : 'Selected period'}</td><td title={row.sourceFile}>{row.sourceFile}</td></tr>)}</tbody>}
  </DetailTable>;
}

function SalesDetails({ rows }: { rows: readonly FifoSaleEntry[] }) {
  return <DetailTable title="B. Sales History" empty={rows.length === 0} columns={11}>
    <thead><tr><th>Source</th><th>Date</th><th>Invoice / Voucher</th><th>Line</th><th>Qty</th><th>Sales Rate</th><th>Sales Value</th><th>FIFO COGS</th><th>Gross Profit</th><th>GP %</th><th>Status</th></tr></thead>
    {rows.length > 0 && <tbody>{rows.map((row) => <tr key={row.id}><td><Badge tone={row.source === 'Sales Return' ? 'warning' : 'neutral'}>{row.source}</Badge></td><td>{formatDate(row.date)}</td><td>{row.invoiceNumber}</td><td>{row.lineNumber}</td><td>{QUANTITY.format(row.quantity)}</td><td>{formatMoney(row.rate)}</td><td>{formatMoney(row.salesValue)}</td><td>{formatMoney(row.fifoCogs)}</td><td className={row.grossProfit != null && row.grossProfit < 0 ? 'fifo-value--negative' : undefined}>{formatMoney(row.grossProfit)}</td><td>{formatPercent(row.grossProfitPercent)}</td><td>{row.unmatchedQuantity > 0 ? <Badge tone="warning">Unmatched {QUANTITY.format(row.unmatchedQuantity)}</Badge> : <Badge tone="success">Costed</Badge>}</td></tr>)}</tbody>}
  </DetailTable>;
}

function AllocationDetails({ rows }: { rows: readonly FifoAllocation[] }) {
  return <DetailTable title="C. FIFO Allocation" empty={rows.length === 0} columns={11}>
    <thead><tr><th>Sales Invoice</th><th>Sales Date</th><th>Purchase Invoice</th><th>Purchase Date</th><th>FIFO Batch</th><th>Qty Consumed</th><th>Purchase Rate</th><th>FIFO Cost</th><th>Sales Rate</th><th>Allocated Sales</th><th>Gross Profit</th></tr></thead>
    {rows.length > 0 && <tbody>{rows.map((row) => <tr className={row.unmatched ? 'fifo-allocation--unmatched' : undefined} key={row.id}><td>{row.salesInvoice}</td><td>{formatDate(row.salesDate)}</td><td>{row.purchaseInvoice}</td><td>{formatDate(row.purchaseDate)}</td><td>{row.purchaseBatch}</td><td>{QUANTITY.format(row.quantity)}</td><td>{formatMoney(row.purchaseRate)}</td><td>{formatMoney(row.fifoCost)}</td><td>{formatMoney(row.salesRate)}</td><td>{formatMoney(row.allocatedSalesValue)}</td><td>{formatMoney(row.grossProfit)}</td></tr>)}</tbody>}
  </DetailTable>;
}

function RemainingDetails({ rows }: { rows: readonly FifoRemainingBatch[] }) {
  return <DetailTable title="D. Remaining Stock" empty={rows.length === 0} columns={8}>
    <thead><tr><th>FIFO Batch</th><th>Source</th><th>Date</th><th>Invoice / Voucher</th><th>Original Qty</th><th>Remaining Qty</th><th>Purchase Rate</th><th>Remaining Value</th></tr></thead>
    {rows.length > 0 && <tbody>{rows.map((row) => <tr key={row.id}><td>{row.batchLabel}</td><td>{row.source}</td><td>{formatDate(row.date)}</td><td>{row.invoiceNumber}</td><td>{QUANTITY.format(row.originalQuantity)}</td><td>{QUANTITY.format(row.remainingQuantity)}</td><td>{formatMoney(row.rate)}</td><td>{formatMoney(row.remainingValue)}</td></tr>)}</tbody>}
  </DetailTable>;
}

function StockDetails({ row }: { row: FifoStockRow }) {
  return <div className="fifo-stock-details">
    <header><div><strong>{row.stockNumber}</strong><span>{row.product} · {row.style} · {row.category} · {row.uom}</span></div>{row.warnings.length > 0 && <div>{row.warnings.map((warning) => <Badge key={warning} tone="warning">{warning}</Badge>)}</div>}</header>
    <PurchaseDetails rows={row.purchases} />
    <SalesDetails rows={row.sales} />
    <AllocationDetails rows={row.allocations} />
    <RemainingDetails rows={row.remainingBatches} />
  </div>;
}

const headerCell = (value: string): CellObject => ({ value, type: String, fontWeight: 'bold', backgroundColor: '#FFF7ED', textColor: '#9A3412', borderColor: '#FED7AA', borderStyle: 'thin', wrap: true });
const textCell = (value: string): CellObject => ({ value, type: String, borderColor: '#E5E7EB', borderStyle: 'thin' });
const numberCell = (value: number | null, money = false): CellObject => value == null
  ? textCell('N/A')
  : { value, type: Number, format: money ? '₹#,##,##0.00;[Red]-₹#,##,##0.00' : '#,##,##0.###;[Red]-#,##,##0.###', borderColor: '#E5E7EB', borderStyle: 'thin' };

function sheetData(headers: string[], rows: SheetData): SheetData {
  return [headers.map(headerCell), ...rows];
}

async function downloadWorkbook(rows: readonly FifoStockRow[], fromDate: string, toDate: string): Promise<void> {
  const summary = sheetData(
    ['Stock Number', 'Purchase Rate', 'Sales Quantity', 'Sales Rate', 'Sales Value', 'Product', 'Gross Profit'],
    rows.map((row) => [textCell(row.stockNumber), textCell(purchaseRates(row)), numberCell(row.totalSalesQuantity), textCell(salesRates(row)), numberCell(row.totalSalesValue, true), textCell(row.product), numberCell(row.grossProfit, true)]),
  );
  const purchaseRows = rows.flatMap((stock) => stock.purchases.map<SheetData[number]>((row) => [textCell(stock.stockNumber), textCell(stock.product), textCell(row.source), textCell(row.date), textCell(row.invoiceNumber), textCell(row.lineNumber), numberCell(row.quantity), numberCell(row.rate, true), numberCell(row.value, true), textCell(row.batchLabel), row.remainingQuantity == null ? textCell('—') : numberCell(row.remainingQuantity), textCell(row.beforePeriod ? 'Before period' : 'Selected period'), textCell(row.sourceFile)]));
  const salesRows = rows.flatMap((stock) => stock.sales.map<SheetData[number]>((row) => [textCell(stock.stockNumber), textCell(stock.product), textCell(row.source), textCell(row.date), textCell(row.invoiceNumber), textCell(row.lineNumber), numberCell(row.quantity), numberCell(row.rate, true), numberCell(row.salesValue, true), numberCell(row.fifoCogs, true), numberCell(row.grossProfit, true), numberCell(row.grossProfitPercent), numberCell(row.unmatchedQuantity)]));
  const allocationRows = rows.flatMap((stock) => stock.allocations.map<SheetData[number]>((row) => [textCell(stock.stockNumber), textCell(row.salesInvoice), textCell(row.salesDate), textCell(row.purchaseInvoice), textCell(row.purchaseDate), textCell(row.purchaseBatch), numberCell(row.quantity), numberCell(row.purchaseRate, true), numberCell(row.fifoCost, true), numberCell(row.salesRate, true), numberCell(row.allocatedSalesValue, true), numberCell(row.grossProfit, true), textCell(row.unmatched ? 'Unmatched' : 'Allocated')]));
  const remainingRows = rows.flatMap((stock) => stock.remainingBatches.map<SheetData[number]>((row) => [textCell(stock.stockNumber), textCell(stock.product), textCell(row.batchLabel), textCell(row.source), textCell(row.date), textCell(row.invoiceNumber), numberCell(row.originalQuantity), numberCell(row.remainingQuantity), numberCell(row.rate, true), numberCell(row.remainingValue, true)]));
  const common = { showGridLines: true, stickyRowsCount: 1 };
  const sheets: Sheet<Blob>[] = [
    { ...common, sheet: 'Summary', data: summary },
    { ...common, sheet: 'Purchases', data: sheetData(['Stock Number', 'Product', 'Source', 'Date', 'Invoice', 'Line', 'Quantity', 'Rate', 'Value', 'FIFO Batch', 'Batch Balance', 'Period', 'Source File'], purchaseRows) },
    { ...common, sheet: 'Sales', data: sheetData(['Stock Number', 'Product', 'Source', 'Date', 'Invoice', 'Line', 'Quantity', 'Sales Rate', 'Sales Value', 'FIFO COGS', 'Gross Profit', 'GP %', 'Unmatched Qty'], salesRows) },
    { ...common, sheet: 'FIFO Allocations', data: sheetData(['Stock Number', 'Sales Invoice', 'Sales Date', 'Purchase Invoice', 'Purchase Date', 'FIFO Batch', 'Quantity', 'Purchase Rate', 'FIFO Cost', 'Sales Rate', 'Allocated Sales', 'Gross Profit', 'Status'], allocationRows) },
    { ...common, sheet: 'Remaining Stock', data: sheetData(['Stock Number', 'Product', 'FIFO Batch', 'Source', 'Date', 'Invoice', 'Original Qty', 'Remaining Qty', 'Purchase Rate', 'Remaining Value'], remainingRows) },
  ];
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  await writeExcelFile(sheets).toFile(`stock-number-fifo-${fromDate}-to-${toDate}.xlsx`);
}

export function FifoStockReport({ uploadsByType }: { uploadsByType: UploadsByType }) {
  const openingStock = useMemo(() => rowsFor(uploadsByType, 'opening-stock'), [uploadsByType]);
  const purchases = useMemo(() => rowsFor(uploadsByType, 'purchases'), [uploadsByType]);
  const sales = useMemo(() => rowsFor(uploadsByType, 'sales'), [uploadsByType]);
  const allRecords = useMemo(() => [...openingStock, ...purchases, ...sales], [openingStock, purchases, sales]);
  const bounds = useMemo(() => dateBounds(allRecords), [allRecords]);
  const [fromDate, setFromDate] = useState(() => bounds?.first ?? '');
  const [toDate, setToDate] = useState(() => bounds?.last ?? '');
  const [periodPreset, setPeriodPreset] = useState('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortColumn, setSortColumn] = useState<SortKey>('stockNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');
  const [pageIndex, setPageIndex] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const years = useMemo(() => [...new Set(allRecords.flatMap((row) => row.invoiceDate ? [financialYearStart(row.invoiceDate)] : []))].sort((left, right) => right - left), [allRecords]);
  const periodOptions = useMemo(() => [{ value: 'all', label: 'All dates' }, { value: 'custom', label: 'Custom dates' }, ...years.map((year) => ({ value: String(year), label: financialYearLabel(year) }))], [years]);
  const result = useMemo(() => bounds && fromDate && toDate && fromDate <= toDate
    ? calculateFifoStockReport(openingStock, purchases, sales, fromDate, toDate)
    : null, [bounds, fromDate, openingStock, purchases, sales, toDate]);
  const visibleRows = useMemo(() => {
    if (!result) return [];
    const filtered = result.rows.filter((row) => {
      const queryMatches = !deferredQuery || [row.stockNumber, row.product, row.style, row.category]
        .some((value) => value.toLocaleLowerCase().includes(deferredQuery));
      const statusMatches = statusFilter === 'all'
        || (statusFilter === 'warnings' && row.warnings.length > 0)
        || (statusFilter === 'unmatched' && row.unmatchedSaleQuantity > 0)
        || (statusFilter === 'missing-cost' && (row.fifoCogs == null || row.closingStockValue == null))
        || (statusFilter === 'in-stock' && row.closingQuantity > 0);
      return queryMatches && statusMatches;
    });
    return [...filtered].sort((left, right) => {
      const leftValue = sortableValue(left, sortColumn);
      const rightValue = sortableValue(right, sortColumn);
      let comparison: number;
      if (leftValue == null && rightValue != null) comparison = 1;
      else if (leftValue != null && rightValue == null) comparison = -1;
      else if (typeof leftValue === 'string' && typeof rightValue === 'string') comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true });
      else comparison = Number(leftValue ?? 0) - Number(rightValue ?? 0);
      if (comparison === 0 && sortColumn !== 'stockNumber') comparison = left.stockNumber.localeCompare(right.stockNumber, undefined, { numeric: true });
      return sortDirection === 'ascending' ? comparison : -comparison;
    });
  }, [deferredQuery, result, sortColumn, sortDirection, statusFilter]);
  const visibleTotals = useMemo(() => summarizeFifoRows(visibleRows), [visibleRows]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const displayedRows = visibleRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  if (!bounds) return <div className="data-upload-result__empty" role="status">Upload Opening Stock, Purchase, or Sales data to prepare the Stock Number Wise FIFO report.</div>;
  if (!result) return <Alert variant="warning" title="Check the report dates">The From Date must be on or before the To Date.</Alert>;

  const handlePreset = (value: string) => {
    setPeriodPreset(value); setPageIndex(0); setExpanded(new Set());
    if (value === 'all') { setFromDate(bounds.first); setToDate(bounds.last); return; }
    const range = financialYearRange(Number(value)); setFromDate(range.from); setToDate(range.to);
  };
  const handleSort = (column: SortKey) => {
    setPageIndex(0);
    if (column === sortColumn) { setSortDirection((current) => current === 'ascending' ? 'descending' : 'ascending'); return; }
    setSortColumn(column); setSortDirection(column === 'stockNumber' || column === 'product' ? 'ascending' : 'descending');
  };
  const toggleExpanded = (stockNumber: string) => setExpanded((current) => {
    const next = new Set(current); if (next.has(stockNumber)) next.delete(stockNumber); else next.add(stockNumber); return next;
  });
  const diagnostics = result.diagnostics;
  const issueCount = diagnostics.missingStockNumberCount + diagnostics.invalidRecordCount + diagnostics.duplicateRecordCount
    + diagnostics.nonFinalizedRecordCount + diagnostics.missingPurchaseRateCount + diagnostics.missingSalesRateCount + diagnostics.unmatchedSaleCount;

  return <div className="fifo-report">
    {issueCount > 0 && <Alert variant="warning" title="FIFO data-quality warnings">
      {diagnostics.unmatchedSaleCount > 0 && <span>{diagnostics.unmatchedSaleCount} sale rows have insufficient stock. </span>}
      {diagnostics.missingPurchaseRateCount > 0 && <span>{diagnostics.missingPurchaseRateCount} inbound rows have no rate. </span>}
      {diagnostics.missingSalesRateCount > 0 && <span>{diagnostics.missingSalesRateCount} sales rows have no rate. </span>}
      {diagnostics.missingStockNumberCount > 0 && <span>{diagnostics.missingStockNumberCount} rows were excluded because Stock Number is missing. </span>}
      {diagnostics.duplicateRecordCount > 0 && <span>{diagnostics.duplicateRecordCount} duplicate rows were excluded. </span>}
      {diagnostics.nonFinalizedRecordCount > 0 && <span>{diagnostics.nonFinalizedRecordCount} draft, cancelled, rejected, or otherwise non-finalized rows were excluded. </span>}
      {diagnostics.invalidRecordCount > 0 && <span>{diagnostics.invalidRecordCount} invalid rows were excluded.</span>}
    </Alert>}
    <section className="fifo-report-card" aria-labelledby="fifo-report-title">
      <header className="fifo-report-header"><div className="fifo-report-heading"><span>Stock Number + FIFO Layers</span><h2 id="fifo-report-title">Purchase, sales, profit and closing stock</h2><p>{formatDate(fromDate)} – {formatDate(toDate)}. Earlier transactions establish brought-forward FIFO layers; closing stock is as of the end date.</p></div>
        <div className="fifo-report-filters" aria-label="FIFO report filters">
          <label htmlFor="fifo-period"><span>Financial Year</span><Select id="fifo-period" value={periodPreset} options={periodOptions} onValueChange={handlePreset} /></label>
          <label htmlFor="fifo-from-date"><span>From Date</span><TextInput id="fifo-from-date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPeriodPreset('custom'); setPageIndex(0); }} /></label>
          <label htmlFor="fifo-to-date"><span>To Date</span><TextInput id="fifo-to-date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPeriodPreset('custom'); setPageIndex(0); }} /></label>
          <label htmlFor="fifo-status"><span>Status</span><Select id="fifo-status" value={statusFilter} options={[{ value: 'all', label: 'All stock numbers' }, { value: 'warnings', label: 'Has warnings' }, { value: 'unmatched', label: 'Unmatched sales' }, { value: 'missing-cost', label: 'Missing cost' }, { value: 'in-stock', label: 'Closing stock > 0' }]} onValueChange={(value) => { setStatusFilter(value); setPageIndex(0); }} /></label>
          <label className="fifo-report-search" htmlFor="fifo-search"><span>Search</span><TextInput id="fifo-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPageIndex(0); }} leadingIcon={<SearchIcon size={16} />} placeholder="Stock number / product / style" /></label>
          <Button variant="secondary" size="sm" leadingIcon={<DownloadIcon size={16} />} disabled={visibleRows.length === 0} onClick={() => { void downloadWorkbook(visibleRows, fromDate, toDate); }}>Download Excel</Button>
        </div>
      </header>
      <div className="fifo-summary-table-wrap"><table className="fifo-summary-table">
        <caption className="sr-only">Stock Number Wise FIFO summary</caption>
        <thead><tr><SortHeader label="Stock Number" column="stockNumber" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} /><th className="fifo-static-header" scope="col">Purchase Rate</th><SortHeader label="Sales Quantity" column="totalSalesQuantity" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} /><th className="fifo-static-header" scope="col">Sales Rate</th><SortHeader label="Sales Value" column="totalSalesValue" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} /><SortHeader label="Product" column="product" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} /><SortHeader label="Gross Profit" column="grossProfit" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} /></tr></thead>
        <tbody>{displayedRows.length > 0 ? displayedRows.map((row) => <Fragment key={row.stockNumber}><tr className={row.warnings.length > 0 ? 'fifo-summary-row--warning' : undefined}><th scope="row"><button type="button" className="fifo-stock-number" aria-expanded={expanded.has(row.stockNumber)} onClick={() => toggleExpanded(row.stockNumber)}>{row.stockNumber}{row.warnings.length > 0 && <AlertCircleIcon size={14} />}<ChevronDownIcon className="fifo-stock-number__chevron" size={14} /></button></th><td className="fifo-rate-list" title={purchaseRates(row)}>{purchaseRates(row)}</td><td>{QUANTITY.format(row.totalSalesQuantity)}</td><td className="fifo-rate-list" title={salesRates(row)}>{salesRates(row)}</td><td>{formatMoney(row.totalSalesValue)}</td><td title={`${row.product} · ${row.style} · ${row.category}`}>{row.product}<small>{row.style} · {row.category}</small></td><td className={row.grossProfit != null && row.grossProfit < 0 ? 'fifo-value--negative' : undefined}>{formatMoney(row.grossProfit)}</td></tr>{expanded.has(row.stockNumber) && <tr className="fifo-details-row"><td colSpan={7}><StockDetails row={row} /></td></tr>}</Fragment>) : <tr><td className="fifo-summary-empty" colSpan={7}>No stock numbers match the selected filters.</td></tr>}</tbody>
        <tfoot><tr><th scope="row">TOTAL</th><td>—</td><td>{QUANTITY.format(visibleTotals.totalSalesQuantity)}</td><td>—</td><td>{formatMoney(visibleTotals.totalSalesValue)}</td><td>{visibleRows.length} stock numbers</td><td>{formatMoney(visibleTotals.grossProfit)}</td></tr></tfoot>
      </table></div>
      <footer className="fifo-report-footer"><span><AlertCircleIcon size={13} /> Stock Number is matched from the uploaded Stock Number / Item Code field only.</span><Badge tone="neutral">{visibleRows.length} of {result.rows.length}</Badge>{visibleRows.length > 0 && <div><span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, visibleRows.length)} of {visibleRows.length}</span><Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPageIndex((page) => Math.max(0, page - 1))}>Previous</Button><Button variant="ghost" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPageIndex((page) => Math.min(pageCount - 1, page + 1))}>Next</Button></div>}</footer>
    </section>
  </div>;
}

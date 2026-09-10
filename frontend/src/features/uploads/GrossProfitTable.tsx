import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ApiError, entityApi } from '@/api';
import { SearchIcon } from '@/components/icons';
import { Alert, Badge, TextInput } from '@/components/ui';
import { TableDownloadButton } from '@/features/reports/TableDownloadButton';
import { calculateGrossProfitLines } from '@/features/reports/grossProfitEngine';
import type { CostingPolicy } from '@/types';
import type { ImportedInventoryFile, ImportKind } from './inventoryImport';

type UploadsByType = Partial<Record<ImportKind, ImportedInventoryFile[]>>;

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function methodLabel(value: 'FIFO' | 'MOVING_WEIGHTED_AVERAGE'): string {
  return value === 'FIFO' ? 'FIFO' : 'Moving average';
}

export function GrossProfitTable({ entityId, uploadsByType }: { entityId: string; uploadsByType: UploadsByType }) {
  const [policy, setPolicy] = useState<CostingPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());

  useEffect(() => {
    let current = true;
    void entityApi.getCostingPolicy(entityId).then((loaded) => {
      if (current) { setPolicy(loaded); setError(null); }
    }).catch((reason: unknown) => {
      if (current) setError(reason instanceof ApiError ? reason.message : 'Unable to load the entity costing method.');
    });
    return () => { current = false; };
  }, [entityId]);

  const rows = useMemo(() => policy ? calculateGrossProfitLines(
    (uploadsByType.sales ?? []).flatMap((file) => file.normalizedRows),
    (uploadsByType.purchases ?? []).flatMap((file) => file.normalizedRows),
    (uploadsByType['opening-stock'] ?? []).flatMap((file) => file.normalizedRows),
    policy,
  ) : [], [policy, uploadsByType]);
  const visibleRows = useMemo(() => rows.filter((row) => !deferredQuery || [
    row.invoiceDate, row.invoiceNumber, row.lineNumber, row.itemCode, row.skuCode,
    row.articleCode, row.description, row.productCategory, row.style, row.costStatus,
  ].some((value) => value.toLocaleLowerCase().includes(deferredQuery))), [deferredQuery, rows]);
  const totals = useMemo(() => rows.reduce((result, row) => ({
    salesValue: result.salesValue + row.salesValue,
    cogs: result.cogs + (row.cogsAmount ?? 0),
    gp: result.gp + (row.grossProfitAmount ?? 0),
    uncosted: result.uncosted + (row.costStatus === 'UNCOSTED' ? 1 : 0),
  }), { salesValue: 0, cogs: 0, gp: 0, uncosted: 0 }), [rows]);

  if (error) return <div className="gross-profit-view"><Alert variant="danger">{error}</Alert></div>;
  if (!policy) return <div className="data-upload-result__empty" role="status">Calculating invoice-item gross profit…</div>;
  if (rows.length === 0) return <div className="data-upload-result__empty" role="status">No valid sales invoice items are available for gross profit calculation.</div>;

  return <section className="gross-profit-view">
    <div className="gross-profit-summary">
      <div><span>Sales Value</span><strong>{currency.format(totals.salesValue)}</strong></div>
      <div><span>Cost of Goods Sold</span><strong>{currency.format(totals.cogs)}</strong></div>
      <div><span>Gross Profit</span><strong>{currency.format(totals.gp)}</strong></div>
      <div className={totals.uncosted ? 'gross-profit-summary__warning' : ''}><span>Uncosted Lines</span><strong>{number.format(totals.uncosted)}</strong></div>
    </div>
    <div className="upload-preview">
      <header className="upload-preview__header"><div><h3>Gross Profit</h3><p>Invoice-item GP using {methodLabel(policy.currentMethod)} for this branch.</p></div><div className="upload-preview__badges"><Badge tone="accent">{methodLabel(policy.currentMethod)}</Badge><Badge tone="neutral">{visibleRows.length} of {rows.length}</Badge></div></header>
      <div className="upload-preview__search"><TextInput id="gross-profit-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leadingIcon={<SearchIcon size={16} />} placeholder="Search invoice or item" aria-label="Search gross profit lines" /><TableDownloadButton tableId="gross-profit-table" fileName="gross-profit-invoice-items.xlsx" /></div>
      <div className="upload-preview__table-wrap"><table id="gross-profit-table" className="upload-preview__table gross-profit-table">
        <thead><tr><th className="upload-preview__row-number">#</th><th>Invoice Date</th><th>Invoice Number</th><th>Line</th><th>SKU / Item</th><th>Description</th><th>Category</th><th>Style</th><th>Qty</th><th>UOM</th><th>Sales Value</th><th>Unit Cost</th><th>COGS</th><th>GP Amount</th><th>GP %</th><th>Method</th><th>Status</th></tr></thead>
        <tbody>{visibleRows.map((row, index) => <tr key={row.transactionKey}><th className="upload-preview__row-number" scope="row">{index + 1}</th><td>{row.invoiceDate}</td><td>{row.invoiceNumber || '—'}</td><td>{row.lineNumber}</td><td>{row.skuCode || row.itemCode || row.articleCode || '—'}</td><td>{row.description || '—'}</td><td>{row.finalProductType || row.productCategory || '—'}</td><td>{row.style || '—'}</td><td>{number.format(row.quantity)}</td><td>{row.uom || '—'}</td><td>{currency.format(row.salesValue)}</td><td>{row.unitCost == null ? '—' : currency.format(row.unitCost)}</td><td>{row.cogsAmount == null ? '—' : currency.format(row.cogsAmount)}</td><td>{row.grossProfitAmount == null ? '—' : currency.format(row.grossProfitAmount)}</td><td>{row.grossProfitPercent == null ? '—' : `${percentage.format(row.grossProfitPercent)}%`}</td><td>{methodLabel(row.costingMethod)}</td><td><Badge tone={row.costStatus === 'COSTED' ? 'success' : 'warning'}>{row.costStatus === 'COSTED' ? 'Costed' : 'Uncosted'}</Badge></td></tr>)}</tbody>
      </table></div>
    </div>
  </section>;
}

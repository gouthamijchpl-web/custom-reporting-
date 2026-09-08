import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircleIcon, PlusIcon } from '@/components/icons';
import { Alert, Badge, Button, FormField, LoadingState, Modal, Select, TextInput } from '@/components/ui';
import { useBranches, useCloudPreference, useEntities } from '@/hooks';
import { loadDailySalesCategorySource } from './dailySalesCategoryReport';
import type { DailySalesCategorySource } from './dailySalesCategoryReport';
import {
  availableMisFinancialYears,
  calculateMisCogsReport,
  misFinancialYearLabel,
  misFinancialYearStartYearFor,
} from './misCogsReport';
import type { MisCogsRow } from './misCogsReport';
import type { MisExpenseSection, MisManualRow, MisManualRowColor } from './misCogsReport';
import { TableDownloadButton } from './TableDownloadButton';
import './MisCogsDashboard.css';

interface ReportLoadState {
  scopeId: string;
  source: DailySalesCategorySource | null;
  error: string | null;
}

interface StoredMisManualRow extends MisManualRow {
  financialYearStartYear: number;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const PERCENT_FORMATTER = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const COST_AFFECTED_ROWS = new Set([
  'grossProfit',
  'grossProfitPercent',
  'contribution',
  'netOperatingProfit',
  'netOperatingProfitPercent',
]);
const MANUAL_SECTION_LABELS: Readonly<Record<MisExpenseSection, string>> = {
  direct: 'Direct Expenses',
  indirect: 'Indirect Expenses',
  finance: 'Finance Cost',
  oneOff: 'One Off Expenses',
};
const MANUAL_ROW_COLORS: ReadonlyArray<{ value: MisManualRowColor; label: string }> = [
  { value: 'white', label: 'White' },
  { value: 'orange', label: 'Orange' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'grey', label: 'Grey' },
];

function manualSectionFromText(value: string): MisExpenseSection | null {
  const normalized = value.trim().replace(/[\s_-]+/g, ' ').toLocaleLowerCase();
  if (normalized === 'direct' || normalized === 'direct expenses') return 'direct';
  if (normalized === 'indirect' || normalized === 'indirect expenses') return 'indirect';
  if (normalized === 'finance' || normalized === 'finance cost') return 'finance';
  if (normalized === 'one off' || normalized === 'one off expenses') return 'oneOff';
  return null;
}

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.valueOf() - offset).toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`));
}

function normalizedDisplayValue(value: number): number {
  return Math.abs(value) < 0.005 ? 0 : value;
}

function formatValue(row: MisCogsRow, value: number): string {
  const normalized = normalizedDisplayValue(value);
  return row.kind === 'percentage'
    ? `${PERCENT_FORMATTER.format(normalized)}%`
    : CURRENCY_FORMATTER.format(normalized);
}

function valueClass(value: number): string | undefined {
  return normalizedDisplayValue(value) < 0 ? 'mis-cogs-table__negative' : undefined;
}

export function MisCogsDashboard() {
  const { selectedEntity } = useEntities();
  const { status: branchStatus, selectableBranches, selectedBranch } = useBranches();
  const selectedEntityId = selectedEntity?.id ?? null;
  const scopeId = selectedEntityId && branchStatus === 'ready'
    ? selectableBranches.length === 0
      ? selectedEntityId
      : selectedBranch
        ? `${selectedEntityId}:branch:${selectedBranch.id}`
        : null
    : null;
  const currentFinancialYear = misFinancialYearStartYearFor(todayIso());
  const requestRef = useRef(0);
  const [loadState, setLoadState] = useState<ReportLoadState | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentFinancialYear);
  const [storedManualRows, setStoredManualRows] = useCloudPreference<StoredMisManualRow[]>(
    `reports.mis-cogs.manual-rows.${scopeId ?? 'unselected'}`,
    [],
  );
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualLabel, setManualLabel] = useState('');
  const [manualSectionText, setManualSectionText] = useState('');
  const [manualColor, setManualColor] = useState<MisManualRowColor>('white');
  const [manualValues, setManualValues] = useState<string[]>(() => Array.from({ length: 12 }, () => ''));
  const [manualLabelError, setManualLabelError] = useState<string | undefined>();
  const [manualSectionError, setManualSectionError] = useState<string | undefined>();

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!scopeId || !selectedEntity) return;
    void loadDailySalesCategorySource(scopeId, { entity: selectedEntity, branch: selectedBranch })
      .then((loaded) => {
        if (requestRef.current !== requestId) return;
        setLoadState({ scopeId, source: loaded, error: null });
        setSelectedYear(currentFinancialYear);
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setLoadState({
          scopeId,
          source: null,
          error: 'The normalized Sales and Purchase data could not be loaded from Supabase.',
        });
      });
  }, [currentFinancialYear, scopeId, selectedBranch, selectedEntity]);

  const source = loadState?.scopeId === scopeId ? loadState.source : null;
  const loadError = loadState?.scopeId === scopeId ? loadState.error : null;
  const yearOptions = useMemo(() => source
    ? availableMisFinancialYears(source, todayIso()).map((year) => ({
      value: String(year),
      label: misFinancialYearLabel(year),
    }))
    : [], [source]);
  const manualRowsForYear = useMemo(() => (
    Array.isArray(storedManualRows)
      ? storedManualRows.filter((manualRow) => manualRow.financialYearStartYear === selectedYear)
      : []
  ), [selectedYear, storedManualRows]);
  const result = useMemo(
    () => source ? calculateMisCogsReport(source, selectedYear, manualRowsForYear) : null,
    [manualRowsForYear, selectedYear, source],
  );

  const closeManualDialog = () => {
    setManualDialogOpen(false);
    setEditingManualId(null);
    setManualLabelError(undefined);
    setManualSectionError(undefined);
  };

  const openAddManualRow = () => {
    setEditingManualId(null);
    setManualLabel('');
    setManualSectionText('');
    setManualColor('white');
    setManualValues(Array.from({ length: 12 }, () => ''));
    setManualLabelError(undefined);
    setManualSectionError(undefined);
    setManualDialogOpen(true);
  };

  const openEditManualRow = (manualId: string) => {
    const manualRow = manualRowsForYear.find((candidate) => candidate.id === manualId);
    if (!manualRow) return;
    setEditingManualId(manualRow.id);
    setManualLabel(manualRow.label);
    setManualSectionText(MANUAL_SECTION_LABELS[manualRow.section]);
    setManualColor(manualRow.color ?? 'white');
    setManualValues(Array.from({ length: 12 }, (_, index) => String(manualRow.monthlyValues[index] ?? 0)));
    setManualLabelError(undefined);
    setManualSectionError(undefined);
    setManualDialogOpen(true);
  };

  const saveManualRow = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = manualLabel.trim().replace(/\s+/g, ' ');
    if (!label) {
      setManualLabelError('Enter a Particular name.');
      return;
    }
    const section = manualSectionFromText(manualSectionText);
    if (!section) {
      setManualSectionError('Enter Direct Expenses, Indirect Expenses, Finance Cost, or One Off Expenses.');
      return;
    }
    const monthlyValues = manualValues.map((value) => {
      const parsed = Number(value.trim() || 0);
      return Number.isFinite(parsed) ? parsed : 0;
    });
    const id = editingManualId ?? globalThis.crypto?.randomUUID?.() ?? `manual-${Date.now()}`;
    const savedRow: StoredMisManualRow = {
      id,
      label,
      section,
      color: manualColor,
      monthlyValues,
      financialYearStartYear: selectedYear,
    };
    setStoredManualRows((current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      return editingManualId
        ? safeCurrent.map((manualRow) => manualRow.id === editingManualId ? savedRow : manualRow)
        : [...safeCurrent, savedRow];
    });
    closeManualDialog();
  };

  const deleteManualRow = () => {
    if (!editingManualId) return;
    setStoredManualRows((current) => (
      Array.isArray(current) ? current.filter((manualRow) => manualRow.id !== editingManualId) : []
    ));
    closeManualDialog();
  };

  if (!selectedEntity) return <Alert variant="info" title="Select an entity">Choose an active entity from the top bar to view this report.</Alert>;
  if (branchStatus === 'loading' || (scopeId && loadState?.scopeId !== scopeId)) return <LoadingState message="Preparing MIS report…" />;
  if (branchStatus === 'error') return <Alert variant="danger" title="Branch unavailable">The active branch could not be loaded. Retry from the branch selector.</Alert>;
  if (!scopeId) return <Alert variant="info" title="Select a branch">Choose an active branch from the top bar to view this report.</Alert>;
  if (loadError) return <Alert variant="danger" title="Report unavailable">{loadError}</Alert>;
  if (!source || !result) return <LoadingState message="Preparing MIS report…" />;

  const expensesIncomplete = Object.values(result.expenseSectionsConfigured).some((configured) => !configured);
  const statusComplete = result.missingCostRowCount === 0 && !expensesIncomplete;

  return <div className="mis-cogs-dashboard">
    <section className="mis-cogs-context" aria-label="MIS financial year and data status">
      <div className="mis-cogs-context__period">
        <label htmlFor="mis-cogs-financial-year">
          <span>Financial Year</span>
          <Select
            id="mis-cogs-financial-year"
            value={String(selectedYear)}
            options={yearOptions}
            onValueChange={(value) => {
              setSelectedYear(Number(value));
              closeManualDialog();
            }}
          />
        </label>
        <div className="mis-cogs-context__range">
          <Badge tone="accent">{result.financialYearLabel}</Badge>
          <span>{formatDate(result.financialYearStart)} – {formatDate(result.financialYearEnd)}</span>
        </div>
      </div>
      <div className="mis-cogs-status">
        <span className="sales-kpi-section__eyebrow">Data status</span>
        <div className="mis-cogs-status__badges">
          <Badge tone={statusComplete ? 'success' : 'warning'} withDot>{statusComplete ? 'Complete' : 'Needs attention'}</Badge>
          <Badge tone={result.missingCostRowCount === 0 ? 'success' : 'warning'}>{result.missingCostRowCount === 0 ? 'COGS complete' : 'COGS incomplete'}</Badge>
          <Badge tone={expensesIncomplete ? 'warning' : 'success'}>{expensesIncomplete ? 'Expense source incomplete' : 'Expenses complete'}</Badge>
        </div>
        {expensesIncomplete && <div className="mis-cogs-status__messages">
          <span>Direct expense source not configured.</span>
          <span>Indirect expense data source is not configured.</span>
          <span>Finance cost and one-off expense sources are not configured.</span>
        </div>}
      </div>
    </section>

    {result.missingCostRowCount > 0 && <Alert variant="warning" title="Missing Purchase Cost">
      Some Sales transactions are missing cost. Gross Profit may be incomplete. {result.missingCostRowCount} {result.missingCostRowCount === 1 ? 'transaction is' : 'transactions are'} affected, representing {CURRENCY_FORMATTER.format(result.missingCostSalesValue)} of Sales.
    </Alert>}

    <section className="mis-cogs-matrix" aria-label="MIS report matrix">
      <header className="mis-cogs-matrix__header">
        <TableDownloadButton tableId="mis-cogs-table" fileName={`mis-cogs-${result.financialYearLabel}.csv`} />
        <Button size="sm" leadingIcon={<PlusIcon size={15} />} onClick={openAddManualRow}>Add row</Button>
      </header>
      <div className="mis-cogs-table-wrap">
        <table id="mis-cogs-table" className="mis-cogs-table">
          <caption className="sr-only">MIS Report - COGS Basis for {result.financialYearLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Particulars</th>
              {result.months.map((month) => <th key={month.key} scope="col">{month.label}</th>)}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => <tr key={row.key} data-row-key={row.key} className={`mis-cogs-table__row mis-cogs-table__row--${row.emphasis}${row.kind === 'section' ? ' mis-cogs-table__row--section' : ''}${row.manualId ? ` mis-cogs-table__row--manual mis-cogs-table__row--manual-${row.manualColor ?? 'white'}` : ''}`}>
              <th scope="row">
                {row.manualId
                  ? <span className="mis-cogs-table__manual-label"><span>{row.label}</span><button type="button" data-csv-exclude onClick={() => openEditManualRow(row.manualId!)}>Edit</button></span>
                  : row.label}
              </th>
              {row.monthlyValues == null
                ? result.months.map((month) => <td key={month.key} aria-label={`${row.label} ${month.label}`}></td>)
                : row.monthlyValues.map((value, index) => {
                  const costIncomplete = COST_AFFECTED_ROWS.has(row.key) && result.missingCostRowsByMonth[index] > 0;
                  return <td key={result.months[index].key} className={valueClass(value)}>
                    {formatValue(row, value)}
                    {costIncomplete && <sup title="Some Sales transactions are missing cost">*</sup>}
                  </td>;
                })}
              <td className={row.total != null ? valueClass(row.total) : undefined}>
                {row.total != null && <>
                  {formatValue(row, row.total)}
                  {COST_AFFECTED_ROWS.has(row.key) && result.missingCostRowCount > 0 && <sup title="Some Sales transactions are missing cost">*</sup>}
                </>}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <footer className="mis-cogs-matrix__footer">
        <span>{source.sourceFileCount} normalized Sales/Purchase source {source.sourceFileCount === 1 ? 'file' : 'files'}</span>
        <span><AlertCircleIcon size={13} /> Duplicate and non-finalized transactions excluded</span>
      </footer>
    </section>

    <Modal
      isOpen={manualDialogOpen}
      title={editingManualId ? 'Edit manual MIS row' : 'Add manual MIS row'}
      description={`Enter the ${result.financialYearLabel} monthly values. The row is included in its selected expense subtotal and downstream profit calculations.`}
      size="lg"
      onClose={closeManualDialog}
      footer={<>
        {editingManualId && <Button className="mis-manual-row__delete" variant="danger" onClick={deleteManualRow}>Delete row</Button>}
        <Button variant="secondary" onClick={closeManualDialog}>Cancel</Button>
        <Button type="submit" form="mis-manual-row-form">Save row</Button>
      </>}
    >
      <form id="mis-manual-row-form" className="mis-manual-row-form" onSubmit={saveManualRow}>
        <div className="mis-manual-row-form__primary">
          <FormField htmlFor="mis-manual-row-label" label="Particular" required error={manualLabelError}>
            <TextInput
              id="mis-manual-row-label"
              value={manualLabel}
              invalid={Boolean(manualLabelError)}
              onChange={(event) => {
                setManualLabel(event.target.value);
                if (manualLabelError) setManualLabelError(undefined);
              }}
              placeholder="Enter row name"
            />
          </FormField>
          <FormField
            htmlFor="mis-manual-row-section"
            label="Expense section"
            required
            error={manualSectionError}
            hint="Type the section name; the value is included in that subtotal."
          >
            <TextInput
              id="mis-manual-row-section"
              value={manualSectionText}
              invalid={Boolean(manualSectionError)}
              placeholder="Type expense section"
              onChange={(event) => {
                setManualSectionText(event.target.value);
                if (manualSectionError) setManualSectionError(undefined);
              }}
            />
          </FormField>
        </div>
        <fieldset className="mis-manual-row-form__colors">
          <legend>Row colour</legend>
          <div role="group" aria-label="Choose manual row colour">
            {MANUAL_ROW_COLORS.map((color) => <button
              key={color.value}
              type="button"
              className={`mis-manual-row-color mis-manual-row-color--${color.value}`}
              aria-pressed={manualColor === color.value}
              onClick={() => setManualColor(color.value)}
            >
              <span aria-hidden="true"></span>
              {color.label}
            </button>)}
          </div>
        </fieldset>
        <fieldset className="mis-manual-row-form__months">
          <legend>Monthly values</legend>
          <div>
            {result.months.map((month, index) => <label key={month.key} htmlFor={`mis-manual-row-month-${index}`}>
              <span>{month.label}</span>
              <TextInput
                id={`mis-manual-row-month-${index}`}
                type="number"
                inputMode="decimal"
                step="any"
                value={manualValues[index]}
                placeholder="0"
                onChange={(event) => setManualValues((current) => current.map((value, valueIndex) => (
                  valueIndex === index ? event.target.value : value
                )))}
              />
            </label>)}
          </div>
        </fieldset>
      </form>
    </Modal>
  </div>;
}

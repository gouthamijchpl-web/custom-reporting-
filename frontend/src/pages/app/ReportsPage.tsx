import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { KeyboardEvent } from 'react';
import {
  AnalyticsIcon,
  CalendarReportIcon,
  CategoryChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ComparisonIcon,
  FinancialReportIcon,
  InventoryClockIcon,
  ProfitIcon,
  ReportsIcon,
  SearchIcon,
  ShieldIcon,
  UsersIcon,
} from '@/components/icons';
import { Badge } from '@/components/ui';
import { DailySalesCategoryDashboard } from '@/features/reports/DailySalesCategoryDashboard';
import { DailySalesStyleDashboard } from '@/features/reports/DailySalesStyleDashboard';
import { MonthlyCategoryDashboard } from '@/features/reports/MonthlyCategoryDashboard';
import { MisCogsDashboard } from '@/features/reports/MisCogsDashboard';
import { SkuProfitabilityDashboard } from '@/features/reports/SkuProfitabilityDashboard';
import { StockAgeingDashboard } from '@/features/reports/StockAgeingDashboard';
import { StyleSalesPurchaseAnalysisDashboard } from '@/features/reports/StyleSalesPurchaseAnalysisDashboard';
import { loadDailySalesCategorySource } from '@/features/reports/dailySalesCategoryReport';
import { useBranches, useCloudPreference, useEntities } from '@/hooks';
import './ReportsPage.css';

type ReportPhase = 'phase-1' | 'phase-2';

interface ReportMasterItem {
  id: string;
  reportName: string;
  phase: ReportPhase;
  description: string;
  activeStatus: boolean;
}

const REPORT_MASTER: readonly ReportMasterItem[] = [
  { id: 'daily-sales-category', reportName: 'Daily Sales Report - Category Wise', phase: 'phase-1', description: 'Daily sales performance grouped by category.', activeStatus: true },
  { id: 'daily-sales-style', reportName: 'Daily Sales Report - Style Wise', phase: 'phase-1', description: 'Daily sales performance grouped by style.', activeStatus: true },
  { id: 'style-sales-purchase', reportName: 'Style Wise Sales against Purchase Analysis', phase: 'phase-1', description: 'Compare style-level sales with purchase activity.', activeStatus: true },
  { id: 'monthly-category', reportName: 'Monthly Category Wise Reports', phase: 'phase-1', description: 'Review monthly reporting by product category.', activeStatus: true },
  { id: 'sku-profitability', reportName: 'SKU Wise Profitability', phase: 'phase-1', description: 'Track monthly profitability at individual SKU level.', activeStatus: true },
  { id: 'stock-ageing', reportName: 'Stock Ageing Report', phase: 'phase-1', description: 'Monitor inventory ageing and holding periods.', activeStatus: true },
  { id: 'mis-cogs', reportName: 'MIS report - COGS Basis', phase: 'phase-1', description: 'Management reporting based on cost of goods sold.', activeStatus: true },
  { id: 'debtors-ageing', reportName: 'Debtors Ageing', phase: 'phase-2', description: 'Review outstanding balances by ageing period.', activeStatus: true },
  { id: 'weekly-collections', reportName: 'Collections Summary for a Week', phase: 'phase-2', description: 'Summarise customer collections for the week.', activeStatus: true },
  { id: 'target-customer-ageing', reportName: 'Debtors Ageing - Target Customers', phase: 'phase-2', description: 'Focus debtor ageing on selected target customers.', activeStatus: true },
  { id: 'cheques-tracker', reportName: 'Customer Cheques Tracker', phase: 'phase-2', description: 'Track customer cheques and collection status.', activeStatus: true },
  { id: 'risk-covered-debtors', reportName: 'Risk Covered Debtors', phase: 'phase-2', description: 'Monitor debtor balances covered against risk.', activeStatus: true },
];

const REPORT_PHASES: readonly ReportPhase[] = ['phase-1', 'phase-2'];

function phaseLabel(phase: ReportPhase): string {
  return phase === 'phase-1' ? 'Phase - 1' : 'Phase - 2';
}

function phaseBadgeLabel(phase: ReportPhase): string {
  return phase === 'phase-1' ? 'Phase 1' : 'Phase 2';
}

const REPORT_ICONS = {
  'daily-sales-category': CategoryChartIcon,
  'daily-sales-style': AnalyticsIcon,
  'style-sales-purchase': ComparisonIcon,
  'monthly-category': CalendarReportIcon,
  'sku-profitability': ProfitIcon,
  'stock-ageing': InventoryClockIcon,
  'mis-cogs': FinancialReportIcon,
  'debtors-ageing': InventoryClockIcon,
  'weekly-collections': CalendarReportIcon,
  'target-customer-ageing': UsersIcon,
  'cheques-tracker': FinancialReportIcon,
  'risk-covered-debtors': ShieldIcon,
} as const;

export function ReportsPage() {
  const { selectedEntity } = useEntities();
  const { status: branchStatus, selectableBranches, selectedBranch } = useBranches();
  const [storedPhase, setActivePhase] = useCloudPreference<ReportPhase>('reports.active-phase', 'phase-1');
  const activePhase: ReportPhase = storedPhase === 'phase-2' ? 'phase-2' : 'phase-1';
  const [selectedReportId, setSelectedReportId] = useCloudPreference<string | null>('reports.selected-report', null);
  const [query, setQuery] = useState('');
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(false);
  const [isNavigationPending, startNavigation] = useTransition();
  const reportContentRef = useRef<HTMLElement>(null);
  const scopeId = selectedEntity && branchStatus === 'ready'
    ? selectableBranches.length === 0 ? selectedEntity.id : selectedBranch ? `${selectedEntity.id}:branch:${selectedBranch.id}` : null
    : null;

  useEffect(() => {
    if (!scopeId || !selectedEntity) return;
    const timer = window.setTimeout(() => {
      void loadDailySalesCategorySource(scopeId, { entity: selectedEntity, branch: selectedBranch }).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scopeId, selectedBranch, selectedEntity]);

  const visibleReports = useMemo(() => REPORT_MASTER.filter((report) => (
    report.activeStatus && report.phase === activePhase
  )), [activePhase]);

  const selectedReport = REPORT_MASTER.find((report) => (
    report.id === selectedReportId && report.phase === activePhase
  )) ?? visibleReports[0] ?? null;

  const filteredReports = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term.length === 0
      ? visibleReports
      : visibleReports.filter((report) => report.reportName.toLocaleLowerCase().includes(term));
  }, [query, visibleReports]);

  const phaseCounts = useMemo(() => ({
    'phase-1': REPORT_MASTER.filter((report) => report.activeStatus && report.phase === 'phase-1').length,
    'phase-2': REPORT_MASTER.filter((report) => report.activeStatus && report.phase === 'phase-2').length,
  }), []);

  const handlePhaseKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + REPORT_PHASES.length) % REPORT_PHASES.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % REPORT_PHASES.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = REPORT_PHASES.length - 1;
    const nextPhase = REPORT_PHASES[nextIndex];
    const firstReport = REPORT_MASTER.find((report) => report.activeStatus && report.phase === nextPhase);
    startNavigation(() => {
      setActivePhase(nextPhase);
      setSelectedReportId(firstReport?.id ?? null);
    });
    document.getElementById(`${nextPhase}-tab`)?.focus();
  };

  const choosePhase = (phase: ReportPhase) => {
    const firstReport = REPORT_MASTER.find((report) => report.activeStatus && report.phase === phase);
    startNavigation(() => {
      setActivePhase(phase);
      setSelectedReportId(firstReport?.id ?? null);
      setQuery('');
    });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void reportContentRef.current?.requestFullscreen();
  };

  return <div className={`reports-page${isCatalogCollapsed ? ' reports-page--catalog-collapsed' : ''}`} aria-busy={isNavigationPending}>
    <aside className="reports-catalog" aria-label="Report browser">
      <div className="reports-catalog__header">
        <div><h1>Reports</h1><p>Browse and preview your reports</p></div>
        <button type="button" className="reports-catalog__collapse" onClick={() => setIsCatalogCollapsed((current) => !current)} aria-label={isCatalogCollapsed ? 'Expand report browser' : 'Collapse report browser'}>
          {isCatalogCollapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
        </button>
      </div>

      <div className="reports-catalog__body">
        <nav className="reports-phase-tabs" role="tablist" aria-label="Report phases">
          {REPORT_PHASES.map((phase, index) => {
            const selected = activePhase === phase;
            return <button
              key={phase}
              id={`${phase}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${phase}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => choosePhase(phase)}
              onKeyDown={(event) => handlePhaseKeyDown(event, index)}
            >
              <span>{phaseBadgeLabel(phase)}</span><strong>{'\u00B7'} {phaseCounts[phase]}</strong>
            </button>;
          })}
        </nav>

        <label className="reports-search" htmlFor="reports-search-input">
          <SearchIcon size={17} />
          <input id="reports-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" />
        </label>

        <section id={`${activePhase}-panel`} className="report-phase" role="tabpanel" aria-labelledby={`${activePhase}-tab`}>
          <div className="report-card-grid">{filteredReports.map((report) => {
          const ReportIcon = REPORT_ICONS[report.id as keyof typeof REPORT_ICONS] ?? ReportsIcon;
          const selected = report.id === selectedReport?.id;
          return <article className={`report-card${selected ? ' report-card--active' : ''}`} key={report.id}>
            <button
              type="button"
              className="report-card__open"
              aria-label={`Open ${report.reportName}`}
              aria-current={selected ? 'page' : undefined}
              onClick={() => startNavigation(() => setSelectedReportId(report.id))}
            >
              <span className="report-card__icon"><ReportIcon size={18} /></span>
              <span className="report-card__content">
                <strong>{report.reportName}</strong>
              </span>
              <span className="report-card__meta">
                <ChevronRightIcon className="report-card__arrow" size={17} />
              </span>
            </button>
          </article>;
          })}</div>
          {filteredReports.length === 0 && <p className="reports-catalog__empty">No reports match “{query.trim()}”.</p>}
        </section>
      </div>
    </aside>

    <main className="report-detail" ref={reportContentRef}>
      {selectedReport ? <>
        <header className="report-detail__header">
          <h1>{selectedReport.reportName}</h1>
          <div className="report-detail__header-actions">
            <Badge tone="accent" className="report-detail__phase-badge">{phaseLabel(selectedReport.phase)}</Badge>
            <button type="button" className="report-detail__fullscreen" onClick={toggleFullscreen} aria-label="View report full screen">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /><path d="m3 8 6-6M21 8l-6-6M3 16l6 6M21 16l-6 6" /></svg>
            </button>
          </div>
        </header>
        {selectedReport.id === 'daily-sales-category' && <DailySalesCategoryDashboard />}
        {selectedReport.id === 'daily-sales-style' && <DailySalesStyleDashboard />}
        {selectedReport.id === 'style-sales-purchase' && <StyleSalesPurchaseAnalysisDashboard />}
        {selectedReport.id === 'monthly-category' && <MonthlyCategoryDashboard />}
        {selectedReport.id === 'sku-profitability' && <SkuProfitabilityDashboard />}
        {selectedReport.id === 'stock-ageing' && <StockAgeingDashboard />}
        {selectedReport.id === 'mis-cogs' && <MisCogsDashboard />}
        {selectedReport.phase === 'phase-2' && <div className="reports-empty"><span><ReportsIcon size={24} /></span><h2>{selectedReport.reportName}</h2><p>This report is ready for its Phase 2 data source.</p></div>}
      </> : <div className="reports-empty"><span><ReportsIcon size={24} /></span><h2>No report selected</h2><p>Choose a report from the browser.</p></div>}
    </main>
  </div>;
}

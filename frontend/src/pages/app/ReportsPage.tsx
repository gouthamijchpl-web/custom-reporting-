import { useEffect, useMemo, useTransition } from 'react';
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
  ShieldIcon,
  UsersIcon,
} from '@/components/icons';
import { AnimatedTabIndicator, Badge, PageHeader } from '@/components/ui';
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
  const [isNavigationPending, startNavigation] = useTransition();
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

  const selectedReport = REPORT_MASTER.find((report) => report.id === selectedReportId) ?? null;

  const visibleReports = useMemo(() => REPORT_MASTER.filter((report) => (
    report.activeStatus && report.phase === activePhase
  )), [activePhase]);

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
    startNavigation(() => setActivePhase(nextPhase));
    document.getElementById(`${nextPhase}-tab`)?.focus();
  };

  if (selectedReport) {
    return <div className="reports-page reports-page--detail" aria-busy={isNavigationPending}>
      <button type="button" className="reports-back" onClick={() => startNavigation(() => setSelectedReportId(null))}><ChevronLeftIcon size={16} />Back to Reports</button>
      <PageHeader
        title={selectedReport.reportName}
        actions={<Badge tone="accent" className="report-detail__phase-badge">{phaseLabel(selectedReport.phase)}</Badge>}
      />
      {selectedReport.id === 'daily-sales-category' && <DailySalesCategoryDashboard />}
      {selectedReport.id === 'daily-sales-style' && <DailySalesStyleDashboard />}
      {selectedReport.id === 'style-sales-purchase' && <StyleSalesPurchaseAnalysisDashboard />}
      {selectedReport.id === 'monthly-category' && <MonthlyCategoryDashboard />}
      {selectedReport.id === 'sku-profitability' && <SkuProfitabilityDashboard />}
      {selectedReport.id === 'stock-ageing' && <StockAgeingDashboard />}
      {selectedReport.id === 'mis-cogs' && <MisCogsDashboard />}
    </div>;
  }

  return <div className="reports-page" aria-busy={isNavigationPending}>
    <PageHeader title="Reports" description="View and manage reports by category." />

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
          onClick={() => startNavigation(() => setActivePhase(phase))}
          onKeyDown={(event) => handlePhaseKeyDown(event, index)}
        >
          <span>{phaseLabel(phase)} Reports</span><strong>{phaseCounts[phase]}</strong>
        </button>;
      })}
      <AnimatedTabIndicator activeKey={activePhase} />
    </nav>

    <section id={`${activePhase}-panel`} className="report-phase" role="tabpanel" aria-labelledby={`${activePhase}-tab`}>
      <div className="report-card-grid">{visibleReports.map((report) => {
          const ReportIcon = REPORT_ICONS[report.id as keyof typeof REPORT_ICONS] ?? ReportsIcon;
          return <article className="report-card" key={report.id}>
            <button
              type="button"
              className="report-card__open"
              aria-label={`Open ${report.reportName}`}
              onClick={() => startNavigation(() => setSelectedReportId(report.id))}
            >
              <span className="report-card__icon"><ReportIcon size={18} /></span>
              <span className="report-card__content">
                <strong>{report.reportName}</strong>
              </span>
              <span className="report-card__meta">
                <span className="report-card__phase">{phaseBadgeLabel(report.phase)}</span>
                <ChevronRightIcon className="report-card__arrow" size={17} />
              </span>
            </button>
          </article>;
        })}</div>
    </section>
  </div>;
}

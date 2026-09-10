import { useEffect, useState } from 'react';
import { ApiError, entityApi } from '@/api';
import { Alert, Button, FormField, Select, TextInput } from '@/components/ui';
import type { CostingPolicy, CostingPolicyApplicationMode, InventoryCostingMethod } from '@/types';
import { invalidateDailySalesCategorySource } from '@/features/reports/dailySalesCategoryReport';

const methodOptions = [
  { value: 'MOVING_WEIGHTED_AVERAGE' as const, label: 'Moving / perpetual weighted average' },
  { value: 'FIFO' as const, label: 'FIFO (first in, first out)' },
];
const applicationOptions = [
  { value: 'RECALCULATE_ALL' as const, label: 'Recalculate all historical transactions' },
  { value: 'EFFECTIVE_DATE' as const, label: 'Apply from an effective date' },
];
const methodLabel = (method: InventoryCostingMethod) => method === 'FIFO' ? 'FIFO' : 'Moving weighted average';

export function CostingPolicyCard({ entityId, isAdmin }: { entityId: string; isAdmin: boolean }) {
  const [policy, setPolicy] = useState<CostingPolicy | null>(null);
  const [method, setMethod] = useState<InventoryCostingMethod>('MOVING_WEIGHTED_AVERAGE');
  const [applicationMode, setApplicationMode] = useState<CostingPolicyApplicationMode>('RECALCULATE_ALL');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let current = true;
    void entityApi.getCostingPolicy(entityId).then((loaded) => {
      if (!current) return;
      setPolicy(loaded); setMethod(loaded.currentMethod); setError(null);
    }).catch((reason: unknown) => {
      if (current) setError(reason instanceof ApiError ? reason.message : 'Unable to load the costing method.');
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [entityId]);

  const save = () => {
    if (applicationMode === 'EFFECTIVE_DATE' && !effectiveDate) { setError('Choose the effective date.'); return; }
    setSaving(true); setError(null); setSaved(false);
    void entityApi.updateCostingPolicy(entityId, {
      method, applicationMode, effectiveDate: applicationMode === 'EFFECTIVE_DATE' ? effectiveDate : null,
    }).then((updated) => {
      setPolicy(updated); invalidateDailySalesCategorySource(); setSaved(true);
    }).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Unable to save the costing method.'))
      .finally(() => setSaving(false));
  };

  return <section className="costing-policy-card">
    <div className="costing-policy-card__heading"><div><h3>Gross Profit Costing</h3><p>Controls invoice-item COGS and GP across each branch and every report.</p></div>{policy && <span>{methodLabel(policy.currentMethod)}</span>}</div>
    {error && <Alert variant="danger">{error}</Alert>}
    {saved && <Alert variant="success">Costing method saved. Gross profit will be recalculated from the selected point.</Alert>}
    <div className="costing-policy-card__form">
      <FormField htmlFor="entity-costing-method" label="Costing Method"><Select id="entity-costing-method" options={methodOptions} value={method} onValueChange={setMethod} disabled={!isAdmin || loading} /></FormField>
      <FormField htmlFor="entity-costing-application" label="Apply Change"><Select id="entity-costing-application" options={applicationOptions} value={applicationMode} onValueChange={setApplicationMode} disabled={!isAdmin || loading} /></FormField>
      {applicationMode === 'EFFECTIVE_DATE' && <FormField htmlFor="entity-costing-effective-date" label="Effective Date"><TextInput id="entity-costing-effective-date" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} disabled={!isAdmin || loading} /></FormField>}
      <Button size="sm" onClick={save} isLoading={saving} disabled={!isAdmin || loading}>Save Costing Method</Button>
    </div>
    {!isAdmin && <p className="costing-policy-card__note">Only administrators can change the costing method.</p>}
    {policy && policy.revisions.length > 1 && <div className="costing-policy-card__history"><strong>Method history</strong><ul>{policy.revisions.map((revision, index) => <li key={revision.id ?? `baseline-${index}`}><span>{methodLabel(revision.method)}</span><time>{revision.effectiveFrom ?? 'All earlier transactions'}</time></li>)}</ul></div>}
  </section>;
}

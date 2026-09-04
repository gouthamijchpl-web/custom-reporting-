import { useMemo, useState } from 'react';
import { ApiError, entityApi } from '@/api';
import { Alert, Button, Drawer, FormField, PasswordInput, Switch, TextInput } from '@/components/ui';
import type { CreateEntityRequest, ReportingEntity } from '@/types';
import './EntitiesSection.css';

interface Props { isOpen: boolean; entity: ReportingEntity | null; onClose: () => void; onSaved: (entity: ReportingEntity) => void; }

const blank: CreateEntityRequest = {
  groupId: '', primaryBranchName: '', name: '', code: '', description: '', pan: '', primaryGstin: '', gstnUsername: '', gstnPassword: '', tallyCompanyName: '', tallyHost: 'localhost', tallyPort: 9000,
  active: true, multipleBranches: false, eInvoiceEnabled: false, eWayBillEnabled: false, stockEnabled: false, costCentreExtractionEnabled: false,
};

export function EntityEditorDrawer({ isOpen, entity, onClose, onSaved }: Props) {
  const initial = useMemo<CreateEntityRequest>(() => entity ? {
    groupId: entity.groupId ?? '', primaryBranchName: '', name: entity.name, code: entity.code ?? '', description: entity.description ?? '', pan: entity.pan ?? '', primaryGstin: entity.primaryGstin ?? '',
    gstnUsername: entity.gstnUsername ?? '', gstnPassword: '',
    tallyCompanyName: entity.tallyCompanyName ?? '', tallyHost: entity.tallyHost, tallyPort: entity.tallyPort, active: entity.active,
    multipleBranches: entity.multipleBranches, eInvoiceEnabled: entity.eInvoiceEnabled, eWayBillEnabled: entity.eWayBillEnabled,
    stockEnabled: entity.stockEnabled, costCentreExtractionEnabled: entity.costCentreExtractionEnabled,
  } : blank, [entity]);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CreateEntityRequest>(key: K, value: CreateEntityRequest[K]) => { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: '' })); };

  const validate = () => {
    const next: Record<string, string> = {};
    if (values.name.trim().length > 120) next.name = 'Entity name must be 120 characters or fewer.';
    if (values.code.trim() && !/^[A-Za-z0-9-]+$/.test(values.code.trim())) next.code = 'Use letters, numbers and hyphens only.';
    if (values.pan && !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(values.pan)) next.pan = 'Enter a valid 10-character PAN.';
    if (values.primaryGstin && !/^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]Z[0-9A-Za-z]$/.test(values.primaryGstin)) next.primaryGstin = 'Enter a valid 15-character GSTIN.';
    if ((values.gstnUsername.trim() || values.gstnPassword) && !values.primaryGstin.trim()) next.primaryGstin = 'Enter the Primary GSTIN before adding credentials.';
    if (values.gstnUsername.length > 120) next.gstnUsername = 'GSTIN username must be 120 characters or fewer.';
    if (values.gstnPassword.length > 512) next.gstnPassword = 'GSTIN password must be 512 characters or fewer.';
    if (values.tallyPort && (!Number.isInteger(values.tallyPort) || values.tallyPort < 1 || values.tallyPort > 65535)) next.tallyPort = 'Enter a port from 1 to 65535.';
    setErrors(next); return Object.keys(next).length === 0;
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); if (!validate()) return;
    setSaving(true); setFormError(null);
    const payload = { ...values, groupId: values.groupId || null, name: values.name.trim(), code: values.code.trim().toUpperCase(), pan: values.pan.trim().toUpperCase(), primaryGstin: values.primaryGstin.trim().toUpperCase(), tallyPort: values.tallyPort || 9000 };
    const request = entity ? entityApi.update(entity.id, payload) : entityApi.create(payload);
    void request.then(onSaved).catch((reason: unknown) => setFormError(reason instanceof ApiError ? reason.message : 'Unable to save changes.')).finally(() => setSaving(false));
  };

  return <Drawer isOpen={isOpen} title={entity ? 'Edit Entity' : 'Create Entity'} description="Configure the company and its accounting behaviour." onClose={onClose}
    footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="entity-editor" isLoading={saving}>{entity ? 'Save changes' : 'Create Entity'}</Button></>}>
    <form id="entity-editor" className="entity-editor" onSubmit={submit} autoComplete="off" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}
      <section className="entity-editor__section"><div className="entity-editor__heading"><span>01</span><div><h3>Basic Information</h3><p>Legal identity and status used throughout reporting.</p></div></div>
        <div className="management-form__grid">
          <FormField htmlFor="entity-name-new" label="Entity Name" error={errors.name}><TextInput id="entity-name-new" value={values.name} invalid={Boolean(errors.name)} onChange={(event) => set('name', event.target.value)} /></FormField>
          <FormField htmlFor="entity-code-new" label="Entity Code" error={errors.code}><TextInput id="entity-code-new" value={values.code} maxLength={12} invalid={Boolean(errors.code)} onChange={(event) => set('code', event.target.value)} /></FormField>
          <FormField htmlFor="entity-pan" label="PAN" error={errors.pan}><TextInput id="entity-pan" value={values.pan} maxLength={10} invalid={Boolean(errors.pan)} onChange={(event) => set('pan', event.target.value.toUpperCase())} /></FormField>
          <FormField htmlFor="entity-gstin" label="Primary GSTIN" error={errors.primaryGstin}><TextInput id="entity-gstin" value={values.primaryGstin} maxLength={15} invalid={Boolean(errors.primaryGstin)} onChange={(event) => set('primaryGstin', event.target.value.toUpperCase())} /></FormField>
          <FormField htmlFor="entity-gstin-username" label="GSTIN Username" error={errors.gstnUsername}><TextInput id="entity-gstin-username" value={values.gstnUsername} maxLength={120} invalid={Boolean(errors.gstnUsername)} autoComplete="off" onChange={(event) => set('gstnUsername', event.target.value)} /></FormField>
          <FormField htmlFor="entity-gstin-password" label={entity?.gstnPasswordConfigured ? 'Replace GSTIN Password' : 'GSTIN Password'} error={errors.gstnPassword} hint={entity?.gstnPasswordConfigured ? 'A password is configured. Leave blank to keep it unchanged.' : 'Encrypted securely when the entity is saved.'}><PasswordInput id="entity-gstin-password" value={values.gstnPassword} maxLength={512} invalid={Boolean(errors.gstnPassword)} autoComplete="off" placeholder={entity?.gstnPasswordConfigured ? '••••••••••••' : ''} onChange={(event) => set('gstnPassword', event.target.value)} /></FormField>
        </div>
        <FormField htmlFor="entity-description-new" label="Description"><textarea id="entity-description-new" className="management-textarea" maxLength={500} value={values.description} onChange={(event) => set('description', event.target.value)} /></FormField>
        <div className="management-form__switch-card"><Switch id="entity-active-new" label="Active" description="Inactive entities remain available for historical reporting." checked={values.active} onChange={(value) => set('active', value)} /></div>
      </section>
      <section className="entity-editor__section"><div className="entity-editor__heading"><span>02</span><div><h3>Accounting Configuration</h3><p>Default connection used for Tally-based books.</p></div></div>
        <FormField htmlFor="entity-tally-company" label="Tally Company Name"><TextInput id="entity-tally-company" value={values.tallyCompanyName} onChange={(event) => set('tallyCompanyName', event.target.value)} /></FormField>
        <div className="management-form__grid"><FormField htmlFor="entity-tally-host" label="Tally Host" error={errors.tallyHost}><TextInput id="entity-tally-host" value={values.tallyHost} invalid={Boolean(errors.tallyHost)} onChange={(event) => set('tallyHost', event.target.value)} /></FormField><FormField htmlFor="entity-tally-port" label="Tally Port" error={errors.tallyPort}><TextInput id="entity-tally-port" type="number" min={1} max={65535} value={values.tallyPort || ''} invalid={Boolean(errors.tallyPort)} onChange={(event) => set('tallyPort', Number(event.target.value))} /></FormField></div>
      </section>
      <section className="entity-editor__section"><div className="entity-editor__heading"><span>03</span><div><h3>Business Features</h3><p>Enable only the capabilities this entity needs.</p></div></div>
        <div className="entity-feature-list">
          <Switch id="feature-branches" label="Multiple Branches" checked={values.multipleBranches} onChange={(value) => set('multipleBranches', value)} />
          <Switch id="feature-einvoice" label="e-Invoice" checked={values.eInvoiceEnabled} onChange={(value) => set('eInvoiceEnabled', value)} />
          <Switch id="feature-eway" label="e-Way Bill" checked={values.eWayBillEnabled} onChange={(value) => set('eWayBillEnabled', value)} />
          <Switch id="feature-stock" label="Stock" checked={values.stockEnabled} onChange={(value) => set('stockEnabled', value)} />
          <Switch id="feature-cost" label="Cost Centre Extraction" checked={values.costCentreExtractionEnabled} onChange={(value) => set('costCentreExtractionEnabled', value)} />
        </div>
      </section>
    </form>
  </Drawer>;
}

import { useEffect, useState } from 'react';
import { ApiError, entityApi, groupApi } from '@/api';
import { EditIcon, PlusIcon } from '@/components/icons';
import { Alert, Button, Checkbox, FormField, Modal, Select, TextInput } from '@/components/ui';
import type { BusinessGroup, CreateEntityRequest, ReportingEntity } from '@/types';
import './CreateEntityModal.css';

const initialValues: CreateEntityRequest = {
  groupId: '', primaryBranchName: '', name: '', code: '', description: '', pan: '', primaryGstin: '', gstnUsername: '', gstnPassword: '',
  tallyCompanyName: '', tallyHost: 'localhost', tallyPort: 9000, active: true, multipleBranches: false,
  eInvoiceEnabled: false, eWayBillEnabled: false, stockEnabled: false, costCentreExtractionEnabled: false,
};

const valuesFor = (entity: ReportingEntity | null): CreateEntityRequest => entity ? {
  ...initialValues,
  groupId: entity.groupId ?? '',
  name: entity.name,
  code: entity.code ?? '',
  description: entity.description ?? '',
  pan: entity.pan ?? '',
  primaryGstin: entity.primaryGstin ?? '',
  gstnUsername: entity.gstnUsername ?? '',
  tallyCompanyName: entity.tallyCompanyName ?? '',
  tallyHost: entity.tallyHost,
  tallyPort: entity.tallyPort,
  active: entity.active,
  multipleBranches: entity.multipleBranches,
  eInvoiceEnabled: entity.eInvoiceEnabled,
  eWayBillEnabled: entity.eWayBillEnabled,
  stockEnabled: entity.stockEnabled,
  costCentreExtractionEnabled: entity.costCentreExtractionEnabled,
} : initialValues;

export function CreateEntityModal({ isOpen, entity = null, onClose, onSaved }: { isOpen: boolean; entity?: ReportingEntity | null; onClose: () => void; onSaved: (entity: ReportingEntity) => void }) {
  const [values, setValues] = useState<CreateEntityRequest>(() => valuesFor(entity));
  const [groups, setGroups] = useState<BusinessGroup[]>([]);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    void groupApi.list().then((loaded) => setGroups(loaded.filter((group) => group.active))).catch((reason: unknown) => setFormError(reason instanceof ApiError ? reason.message : 'Unable to load groups.'));
  }, [isOpen]);

  const set = <K extends keyof CreateEntityRequest>(key: K, value: CreateEntityRequest[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };
  const close = () => { setValues(initialValues); setErrors({}); setFormError(null); onClose(); };
  const validate = () => {
    const next: Record<string, string> = {};
    if (values.name.trim().length > 120) next.name = 'Entity name must be 120 characters or fewer.';
    if (values.code.trim() && !/^[A-Za-z0-9-]+$/.test(values.code.trim())) next.code = 'Use letters, numbers and hyphens only.';
    if (values.pan && !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(values.pan)) next.pan = 'Enter a valid 10-character PAN.';
    if (values.primaryGstin && !/^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]Z[0-9A-Za-z]$/.test(values.primaryGstin)) next.primaryGstin = 'Enter a valid 15-character GSTIN.';
    if (values.tallyPort && (!Number.isInteger(values.tallyPort) || values.tallyPort < 1 || values.tallyPort > 65535)) next.tallyPort = 'Enter a port from 1 to 65535.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true); setFormError(null);
    const payload = { ...values, groupId: values.groupId || null, name: values.name.trim(), code: values.code.trim().toUpperCase(), primaryBranchName: values.primaryBranchName.trim(), pan: values.pan.trim().toUpperCase(), primaryGstin: values.primaryGstin.trim().toUpperCase(), tallyCompanyName: values.tallyCompanyName.trim(), tallyHost: values.tallyHost.trim(), tallyPort: values.tallyPort || 9000 };
    const request = entity ? entityApi.update(entity.id, payload) : entityApi.create(payload);
    void request.then((saved) => { setValues(initialValues); onSaved(saved); }).catch((reason: unknown) => {
      if (reason instanceof ApiError) { setErrors(reason.toFieldMessages()); setFormError(reason.message); }
      else setFormError(entity ? 'Unable to update entity.' : 'Unable to create entity.');
    }).finally(() => setSaving(false));
  };

  const groupOptions = [{ value: '', label: groups.length ? 'Select a group' : 'No active groups available' }, ...groups.map((group) => ({ value: group.id, label: `${group.name} (${group.seriesCode})` }))];
  return <Modal isOpen={isOpen} title={entity ? 'Edit Entity' : 'Create Entity'} description={entity ? 'Update this company and its accounting configuration.' : 'Add a company and its default accounting configuration.'} size="lg" onClose={close} footer={<><Button variant="secondary" disabled={saving} onClick={close}>Cancel</Button><Button type="submit" form="create-entity-modal-form" isLoading={saving} leadingIcon={entity ? <EditIcon /> : <PlusIcon />}>{entity ? 'Save Changes' : 'Create Entity'}</Button></>}>
    <form id="create-entity-modal-form" className="create-entity-modal-form" onSubmit={submit} autoComplete="off" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}
      <div className="create-entity-modal-form__grid">
        <FormField htmlFor="create-entity-group" label="Group" error={errors.groupId}><Select id="create-entity-group" options={groupOptions} value={values.groupId ?? ''} invalid={Boolean(errors.groupId)} onValueChange={(groupId) => set('groupId', groupId || null)} /></FormField>
        <FormField htmlFor="create-entity-name" label="Entity Name" error={errors.name}><TextInput id="create-entity-name" value={values.name} invalid={Boolean(errors.name)} maxLength={120} placeholder="Optional" onChange={(event) => set('name', event.target.value)} /></FormField>
        <FormField htmlFor="create-entity-code" label="Entity Code" error={errors.code}><TextInput id="create-entity-code" value={values.code} invalid={Boolean(errors.code)} maxLength={12} placeholder="Optional" onChange={(event) => set('code', event.target.value.toUpperCase())} /></FormField>
        <FormField htmlFor="create-entity-tally-company" label="Tally Company Name"><TextInput id="create-entity-tally-company" value={values.tallyCompanyName} maxLength={120} onChange={(event) => set('tallyCompanyName', event.target.value)} /></FormField>
        <FormField htmlFor="create-entity-host" label="Tally Host" error={errors.tallyHost}><TextInput id="create-entity-host" value={values.tallyHost} invalid={Boolean(errors.tallyHost)} maxLength={255} onChange={(event) => set('tallyHost', event.target.value)} /></FormField>
        <FormField htmlFor="create-entity-port" label="Tally Port" error={errors.tallyPort}><TextInput id="create-entity-port" type="number" min={1} max={65535} value={values.tallyPort || ''} invalid={Boolean(errors.tallyPort)} onChange={(event) => set('tallyPort', Number(event.target.value))} /></FormField>
        <FormField htmlFor="create-entity-branch" label="Primary Branch Name"><TextInput id="create-entity-branch" value={values.primaryBranchName} maxLength={120} onChange={(event) => set('primaryBranchName', event.target.value)} /></FormField>
        <FormField htmlFor="create-entity-pan" label="PAN" error={errors.pan}><TextInput id="create-entity-pan" value={values.pan} invalid={Boolean(errors.pan)} maxLength={10} onChange={(event) => set('pan', event.target.value.toUpperCase())} /></FormField>
        <FormField htmlFor="create-entity-gstin" label="GSTIN" error={errors.primaryGstin}><TextInput id="create-entity-gstin" value={values.primaryGstin} invalid={Boolean(errors.primaryGstin)} maxLength={15} onChange={(event) => set('primaryGstin', event.target.value.toUpperCase())} /></FormField>
      </div>
      <div className="create-entity-modal-form__options">
        <Checkbox id="create-entity-active" label="Active" checked={values.active} onChange={(event) => set('active', event.target.checked)} />
        <Checkbox id="create-entity-branches" label="Multiple Branches" checked={values.multipleBranches} onChange={(event) => set('multipleBranches', event.target.checked)} />
        <Checkbox id="create-entity-einvoice" label="Enable e-Invoice" checked={values.eInvoiceEnabled} onChange={(event) => set('eInvoiceEnabled', event.target.checked)} />
        <Checkbox id="create-entity-eway" label="Enable e-Way Bill" checked={values.eWayBillEnabled} onChange={(event) => set('eWayBillEnabled', event.target.checked)} />
        <Checkbox id="create-entity-stock" label="Enable Stock" checked={values.stockEnabled} onChange={(event) => set('stockEnabled', event.target.checked)} />
        <Checkbox id="create-entity-cost" label="Enable Cost Centre Extraction" checked={values.costCentreExtractionEnabled} onChange={(event) => set('costCentreExtractionEnabled', event.target.checked)} />
      </div>
    </form>
  </Modal>;
}

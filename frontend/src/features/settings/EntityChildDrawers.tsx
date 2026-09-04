import { useEffect, useRef, useState } from 'react';
import { ApiError, entityApi } from '@/api';
import { Alert, Button, Checkbox, ConfirmDialog, FormField, Modal, PasswordInput, Select, TextInput } from '@/components/ui';
import type { BookRequest, BookSource, BranchRequest, EntityBook, EntityBranch, EntityGstin, GstinRequest, RegistrationType } from '@/types';
import './EntitiesSection.css';

interface BaseProps { entityId: string; isOpen: boolean; onClose: () => void; onSaved: () => void; }

export function BranchDrawer({ entityId, isOpen, onClose, onSaved, branch }: BaseProps & { branch: EntityBranch | null }) {
  const [values, setValues] = useState<BranchRequest>({ name: branch?.name ?? '', code: branch?.code ?? '', primaryBranch: branch?.primaryBranch ?? false, active: branch?.active ?? true });
  const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (values.code.trim() && !/^[A-Za-z0-9-]+$/.test(values.code)) { setError('Use only letters, numbers and hyphens in the branch code.'); return; } if (!entityId) { setError('Create an entity before saving this branch.'); return; }
    setSaving(true); setError(null); const payload = { ...values, name: values.name.trim(), code: values.code.trim().toUpperCase() };
    const request = branch ? entityApi.updateBranch(entityId, branch.id, payload) : entityApi.createBranch(entityId, payload);
    void request.then(() => { onSaved(); onClose(); }).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Unable to save branch.')).finally(() => setSaving(false)); };
  return <Modal isOpen={isOpen} title={branch ? 'Edit Branch' : 'Create Branch'} description={branch ? 'Update this branch for the selected entity.' : 'Add a branch to the selected entity.'} size="lg" onClose={onClose} footer={<><Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" form="create-branch-form" isLoading={saving}>{branch ? 'Save Changes' : 'Create Branch'}</Button></>}>
    <form id="create-branch-form" className="branch-modal-form" onSubmit={submit} autoComplete="off" noValidate>
      {error && <Alert variant="danger">{error}</Alert>}
      <FormField htmlFor="create-branch-name" label="Branch Name"><TextInput id="create-branch-name" value={values.name} maxLength={120} placeholder="Optional" onChange={(event) => setValues({ ...values, name: event.target.value })} /></FormField>
      <FormField htmlFor="create-branch-code" label="Branch Code" hint="Optional. A unique draft code is generated when left blank."><TextInput id="create-branch-code" value={values.code} maxLength={20} placeholder="Optional" onChange={(event) => setValues({ ...values, code: event.target.value.toUpperCase() })} /></FormField>
      <div className="branch-modal-form__options"><Checkbox id="create-branch-primary" label="Set as Primary" checked={values.primaryBranch} onChange={(event) => setValues({ ...values, primaryBranch: event.target.checked })} /><Checkbox id="create-branch-active" label="Active" checked={values.active} onChange={(event) => setValues({ ...values, active: event.target.checked })} /></div>
    </form>
  </Modal>;
}

const STATE_CODES: Record<string, string> = { '01':'Jammu and Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','27':'Maharashtra','28':'Andhra Pradesh (Old)','29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh' };
const REGISTRATION_OPTIONS = [
  { value: 'REGULAR', label: 'Regular' }, { value: 'COMPOSITION', label: 'Composition' },
  { value: 'CASUAL_TAXABLE_PERSON', label: 'Casual Taxable Person' }, { value: 'SEZ', label: 'SEZ' }, { value: 'OTHER', label: 'Other' },
] as const;

export function GstinDrawer({ entityId, entityName, branches, isOpen, onClose, onSaved, gstin }: BaseProps & { entityName: string; branches: EntityBranch[]; gstin: EntityGstin | null }) {
  const [values, setValues] = useState<GstinRequest>({ gstin: gstin?.gstin ?? '', linkedBookId: gstin?.linkedBookId ?? null, linkedBranchId: gstin?.linkedBranchId ?? null, stateName: gstin?.stateName ?? '', registrationType: gstin?.registrationType ?? 'REGULAR', gstnUsername: gstin?.gstnUsername ?? '', gstnPassword: '', active: gstin?.active ?? true, eInvoiceApplicable: gstin?.eInvoiceApplicable ?? false });
  const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const updateGstin = (value: string) => { const normalized = value.toUpperCase(); setValues((current) => ({ ...current, gstin: normalized, stateName: STATE_CODES[normalized.slice(0, 2)] ?? current.stateName })); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (values.gstin.trim() && !values.gstin.startsWith('DRAFT-') && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(values.gstin)) { setError('Enter a valid GSTIN or leave it blank.'); return; } if (!entityId) { setError('Create an entity before saving this GSTIN.'); return; }
    setSaving(true); setError(null); const request = gstin ? entityApi.updateGstin(entityId, gstin.id, values) : entityApi.createGstin(entityId, values);
    void request.then(() => { onSaved(); onClose(); }).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Unable to save GSTIN.')).finally(() => setSaving(false)); };
  return <Modal isOpen={isOpen} title={gstin ? 'Edit GSTIN' : 'Add GSTIN'} description={gstin ? 'Update this tax registration for the selected entity.' : 'Configure a tax registration for the selected entity.'} size="lg" onClose={onClose} footer={<><Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" form="create-gstin-form" isLoading={saving}>{gstin ? 'Save Changes' : 'Create GSTIN'}</Button></>}>
    <form id="create-gstin-form" className="gstin-modal-form" onSubmit={submit} autoComplete="off" noValidate>
      {error && <Alert variant="danger">{error}</Alert>}
      <FormField htmlFor="create-gstin-value" label="GSTIN" hint="Optional. A draft reference is generated when left blank."><TextInput id="create-gstin-value" maxLength={15} value={values.gstin} placeholder="Optional" onChange={(event) => updateGstin(event.target.value)} /></FormField>
      <FormField htmlFor="create-gstin-book" label="Linked Book"><LinkedEntityBranchSelect id="create-gstin-book" entityName={entityName} branches={branches} value={values.linkedBranchId} onChange={(linkedBranchId) => setValues({ ...values, linkedBookId: null, linkedBranchId })} /></FormField>
      <FormField htmlFor="create-gstin-state" label="State Name"><TextInput id="create-gstin-state" value={values.stateName} maxLength={80} placeholder="Optional" onChange={(event) => setValues({ ...values, stateName: event.target.value })} /></FormField>
      <FormField htmlFor="create-gstin-type" label="Registration Type"><Select<RegistrationType> id="create-gstin-type" options={REGISTRATION_OPTIONS} value={values.registrationType} onValueChange={(registrationType) => setValues({ ...values, registrationType })} /></FormField>
      <FormField htmlFor="create-gstin-user" label="GSTN Username"><TextInput id="create-gstin-user" value={values.gstnUsername} maxLength={120} autoComplete="off" placeholder="GST portal username" onChange={(event) => setValues({ ...values, gstnUsername: event.target.value })} /></FormField>
      <FormField htmlFor="create-gstin-password" label={gstin?.passwordConfigured ? 'Replace GSTN Password' : 'GSTN Password'} hint={gstin?.passwordConfigured ? 'A password is configured. Leave blank to keep it unchanged.' : 'The password is encrypted and never returned by the API.'}><PasswordInput id="create-gstin-password" value={values.gstnPassword} maxLength={512} autoComplete="off" placeholder={gstin?.passwordConfigured ? 'Password already configured' : 'GST portal password'} onChange={(event) => setValues({ ...values, gstnPassword: event.target.value })} /></FormField>
      <div className="gstin-modal-form__options"><Checkbox id="create-gstin-active" label="Active" checked={values.active} onChange={(event) => setValues({ ...values, active: event.target.checked })} /><Checkbox id="create-gstin-einvoice" label="e-Invoice applicable" checked={values.eInvoiceApplicable} onChange={(event) => setValues({ ...values, eInvoiceApplicable: event.target.checked })} /></div>
    </form>
  </Modal>;
}

function LinkedEntityBranchSelect({ id, entityName, branches, value, onChange }: { id: string; entityName: string; branches: EntityBranch[]; value: string | null; onChange: (value: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedBranch = branches.find((branch) => branch.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const choose = (bookId: string | null) => { onChange(bookId); setOpen(false); };
  return <div ref={rootRef} className="linked-book-select">
    <button id={id} type="button" className="linked-book-select__trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{selectedBranch ? `${entityName} — ${selectedBranch.name}` : branches.length === 0 && entityName ? entityName : 'Select Entity / Branch'}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="linked-book-select__menu" role="listbox" aria-labelledby={id}>
      {branches.length === 0
        ? <button type="button" role="option" aria-selected={value === null} className="linked-book-select__option linked-book-select__option--selected" onClick={() => choose(null)}><span>{entityName || 'No entity selected'}</span><small>Entity</small></button>
        : branches.map((branch) => <button key={branch.id} type="button" role="option" aria-selected={branch.id === value} className={branch.id === value ? 'linked-book-select__option linked-book-select__option--selected' : 'linked-book-select__option'} onClick={() => choose(branch.id)}><span>{entityName} — {branch.name}</span><small>{branch.primaryBranch ? 'Primary branch' : 'Branch'}{branch.active ? '' : ' · Inactive'}</small></button>)}
    </div>}
  </div>;
}

const defaultDomain = import.meta.env.VITE_ZOHO_ACCOUNTS_DOMAIN ?? 'https://accounts.zoho.in';
export function BookDrawer({ entityId, isOpen, onClose, onSaved, book, books }: BaseProps & { book: EntityBook | null; books: EntityBook[] }) {
  const [values, setValues] = useState<BookRequest>({ name: book?.name ?? '', source: book?.source ?? 'TALLY', primaryBook: book?.primaryBook ?? false, active: book?.active ?? true, tallyCompanyName: book?.tallyCompanyName ?? '', tallyHost: book?.tallyHost ?? 'localhost', tallyPort: book?.tallyPort ?? 9000, clientId: book?.clientId ?? '', clientSecret: '', accountsDomain: book?.accountsDomain ?? defaultDomain, generatedCode: '', apiDomain: book?.apiDomain ?? '', organizationId: book?.organizationId ?? '', organizationName: book?.organizationName ?? '', generateAndStoreToken: false });
  const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [confirmPrimary, setConfirmPrimary] = useState(false);
  const hasOtherPrimary = books.some((candidate) => candidate.primaryBook && candidate.id !== book?.id);
  const performSave = () => { setSaving(true); setError(null); const payload = { ...values, tallyPort: values.tallyPort || 9000, generateAndStoreToken: values.source === 'ZOHO_BOOKS' && Boolean(values.clientId.trim() && values.clientSecret.trim() && values.accountsDomain.trim() && values.generatedCode.trim() && values.organizationId.trim()) };
    const request = book ? entityApi.updateBook(entityId, book.id, payload) : entityApi.createBook(entityId, payload);
    void request.then(() => { setConfirmPrimary(false); onSaved(); onClose(); }).catch((reason: unknown) => { setConfirmPrimary(false); setError(reason instanceof ApiError ? reason.message : 'Unable to connect this book.'); }).finally(() => setSaving(false)); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!entityId) { setError('Create an entity before saving this book.'); return; }
    if (values.source === 'TALLY' && values.tallyPort && (values.tallyPort < 1 || values.tallyPort > 65535)) { setError('Enter a Tally port from 1 to 65535 or leave it blank.'); return; }
    if (values.primaryBook && hasOtherPrimary) setConfirmPrimary(true); else performSave(); };
  const modalSourceButton = (source: BookSource, label: string) => <button type="button" className={values.source === source ? 'book-modal-source__button book-modal-source__button--active' : 'book-modal-source__button'} aria-pressed={values.source === source} onClick={() => setValues({ ...values, source })}>{label}</button>;
  return <><Modal isOpen={isOpen && !confirmPrimary} title={book ? 'Edit Book' : 'Add Book'} description={book ? 'Update this accounting source for the selected entity.' : 'Connect a Tally or Zoho Books source to the selected entity.'} size="lg" onClose={onClose} footer={<><Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" form="create-book-form" isLoading={saving}>{book ? 'Save Changes' : 'Create Book'}</Button></>}>
    <form id="create-book-form" className="book-modal-form" onSubmit={submit} autoComplete="off" noValidate>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="book-modal-form__top"><FormField htmlFor="create-book-name" label="Book Name"><TextInput id="create-book-name" value={values.name} maxLength={120} placeholder="Optional" onChange={(event) => setValues({ ...values, name: event.target.value })} /></FormField><div className="form-field"><span className="form-field__label">Source</span><div className="book-modal-source">{modalSourceButton('TALLY', 'Tally')}{modalSourceButton('ZOHO_BOOKS', 'Zoho Books')}</div></div></div>
      {values.source === 'TALLY' ? <div className="book-modal-form__tally">
        <FormField htmlFor="create-book-company" label="Tally Company Name"><TextInput id="create-book-company" value={values.tallyCompanyName} maxLength={120} onChange={(event) => setValues({ ...values, tallyCompanyName: event.target.value })} /></FormField>
        <FormField htmlFor="create-book-host" label="Tally Host"><TextInput id="create-book-host" value={values.tallyHost} maxLength={255} onChange={(event) => setValues({ ...values, tallyHost: event.target.value })} /></FormField>
        <FormField htmlFor="create-book-port" label="Tally Port"><TextInput id="create-book-port" type="number" min={1} max={65535} value={values.tallyPort || ''} onChange={(event) => setValues({ ...values, tallyPort: Number(event.target.value) })} /></FormField>
      </div> : <section className="book-modal-form__zoho">
        <div className="book-modal-form__grid"><FormField htmlFor="create-zoho-client" label="Client ID"><TextInput id="create-zoho-client" value={values.clientId} onChange={(event) => setValues({ ...values, clientId: event.target.value })} /></FormField><FormField htmlFor="create-zoho-accounts" label="Accounts Domain"><TextInput id="create-zoho-accounts" type="url" value={values.accountsDomain} onChange={(event) => setValues({ ...values, accountsDomain: event.target.value })} /></FormField><FormField htmlFor="create-zoho-secret" label={book?.secretConfigured ? 'Replace Client Secret' : 'Client Secret'} hint={book?.secretConfigured ? 'A secret is configured. Leave blank to keep it unchanged.' : undefined}><PasswordInput id="create-zoho-secret" value={values.clientSecret} autoComplete="off" placeholder={book?.secretConfigured ? 'Secret already configured' : ''} onChange={(event) => setValues({ ...values, clientSecret: event.target.value })} /></FormField><FormField htmlFor="create-zoho-code" label="Generated Code" hint="Optional. Tokens are generated only when all Zoho connection values are entered."><PasswordInput id="create-zoho-code" value={values.generatedCode} placeholder="1000.xxxxx.xxxxx" onChange={(event) => setValues({ ...values, generatedCode: event.target.value })} /></FormField></div>
        <div className="book-modal-form__zoho-bottom"><FormField htmlFor="create-zoho-api" label="API Domain"><TextInput id="create-zoho-api" type="url" value={values.apiDomain} onChange={(event) => setValues({ ...values, apiDomain: event.target.value })} /></FormField><FormField htmlFor="create-zoho-org" label="Organization ID"><TextInput id="create-zoho-org" value={values.organizationId} onChange={(event) => setValues({ ...values, organizationId: event.target.value })} /></FormField><FormField htmlFor="create-zoho-org-name" label="Organization Name"><TextInput id="create-zoho-org-name" value={values.organizationName} onChange={(event) => setValues({ ...values, organizationName: event.target.value })} /></FormField></div>
        <p className="book-modal-form__token-note">The backend will generate and securely store the Zoho token after Create Book.</p>
      </section>}
      <div className="book-modal-form__options"><Checkbox id="create-book-primary" label="Set as Primary Book" checked={values.primaryBook} onChange={(event) => setValues({ ...values, primaryBook: event.target.checked })} /><Checkbox id="create-book-active" label="Active" checked={values.active} onChange={(event) => setValues({ ...values, active: event.target.checked })} /></div>
    </form>
  </Modal><ConfirmDialog isOpen={confirmPrimary} title="Change Primary Book?" message="This book will become primary and the previous primary book will be updated safely." confirmLabel="Change primary" isConfirming={saving} onConfirm={performSave} onCancel={() => setConfirmPrimary(false)} /></>;
}

import { useCallback, useEffect, useState } from 'react';
import { ApiError, settingsApi } from '@/api';
import { BuildingIcon, EditIcon } from '@/components/icons';
import { Alert, Badge, Button, Card, CardBody, CardHeader, FormField, LoadingState, Switch, TextInput } from '@/components/ui';
import { useAuth, useToast } from '@/hooks';
import type { WorkspaceConfiguration, WorkspaceConfigurationRequest } from '@/types';
import { isAdministratorRole } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import './SettingsManagement.css';

export function WorkspaceSetupSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [workspace, setWorkspace] = useState<WorkspaceConfiguration | null>(null);
  const [form, setForm] = useState<WorkspaceConfigurationRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isAdmin = isAdministratorRole(user?.role);

  const load = useCallback(() => settingsApi.getWorkspace().then(setWorkspace).catch((reason: unknown) => {
    setError(reason instanceof ApiError ? reason.message : 'Unable to load workspace settings.');
  }), []);
  useEffect(() => { void load(); }, [load]);

  const startEditing = () => workspace && setForm({
    name: workspace.name, code: workspace.code, description: workspace.description ?? '', active: workspace.active,
    defaultCurrency: workspace.defaultCurrency, timeZone: workspace.timeZone,
  });

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (!form.name.trim() || !form.code.trim() || !/^[A-Z]{3}$/.test(form.defaultCurrency.toUpperCase())) {
      setError('Workspace name, code and a three-letter currency are required.'); return;
    }
    setSaving(true); setError(null);
    void settingsApi.updateWorkspace({ ...form, code: form.code.trim().toUpperCase(), defaultCurrency: form.defaultCurrency.trim().toUpperCase() })
      .then((saved) => { setWorkspace(saved); setForm(null); toast.success('Workspace settings saved successfully.'); })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Unable to save changes.'))
      .finally(() => setSaving(false));
  };

  if (!workspace) return error ? <Alert variant="danger">{error}</Alert> : <LoadingState message="Loading workspace settings…" />;

  return <Card className="workspace-setup-card">
    <CardHeader icon={<BuildingIcon />} title="Workspace Setup" description="General details and defaults for this workspace."
      actions={isAdmin && !form ? <Button variant="secondary" leadingIcon={<EditIcon />} onClick={startEditing}>Edit workspace</Button> : undefined} />
    <CardBody>
      {error && <Alert variant="danger">{error}</Alert>}
      {form ? <form className="management-form" onSubmit={save} autoComplete="off">
        <div className="management-form__grid">
          <FormField htmlFor="workspace-name" label="Workspace Name" required><TextInput id="workspace-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
          <FormField htmlFor="workspace-code" label="Workspace Code" required><TextInput id="workspace-code" value={form.code} maxLength={20} onChange={(event) => setForm({ ...form, code: event.target.value })} /></FormField>
          <FormField htmlFor="workspace-currency" label="Default Currency" required><TextInput id="workspace-currency" value={form.defaultCurrency} maxLength={3} onChange={(event) => setForm({ ...form, defaultCurrency: event.target.value })} /></FormField>
          <FormField htmlFor="workspace-timezone" label="Time Zone" required><TextInput id="workspace-timezone" value={form.timeZone} onChange={(event) => setForm({ ...form, timeZone: event.target.value })} /></FormField>
        </div>
        <FormField htmlFor="workspace-description" label="Description"><textarea id="workspace-description" className="management-textarea" value={form.description} maxLength={500} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
        <div className="management-form__switch-card"><Switch id="workspace-active" label="Active workspace" description="Inactive keeps configuration available but signals that business activity is paused." checked={form.active} onChange={(active) => setForm({ ...form, active })} /></div>
        <div className="management-form__actions"><Button variant="secondary" onClick={() => { setForm(null); setError(null); }}>Cancel</Button><Button type="submit" isLoading={saving}>Save changes</Button></div>
      </form> : <div className="workspace-overview">
        <div className="workspace-overview__hero"><div><span className="workspace-overview__eyebrow">{workspace.code}</span><h3>{workspace.name}</h3><p>{workspace.description || 'No workspace description has been added.'}</p></div><Badge tone={workspace.active ? 'success' : 'neutral'}>{workspace.active ? 'Active' : 'Inactive'}</Badge></div>
        <dl className="management-detail-grid"><div><dt>Default currency</dt><dd>{workspace.defaultCurrency}</dd></div><div><dt>Time zone</dt><dd>{workspace.timeZone}</dd></div><div><dt>Created date</dt><dd>{formatDateTime(workspace.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{formatDateTime(workspace.updatedAt)}</dd></div></dl>
        {!isAdmin && <p className="management-readonly">You have read-only access. An administrator can update workspace settings.</p>}
      </div>}
    </CardBody>
  </Card>;
}

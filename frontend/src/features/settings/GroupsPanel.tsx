import { useCallback, useEffect, useState } from 'react';
import { ApiError, groupApi } from '@/api';
import { EditIcon, PlusIcon, SearchIcon, SlidersIcon, TrashIcon, UsersIcon } from '@/components/icons';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, FormField, LoadingState, Modal, Switch, TextInput } from '@/components/ui';
import { useAuth, useToast } from '@/hooks';
import { isAdministratorRole } from '@/types';
import type { BusinessGroup, ReportingEntity } from '@/types';
import './GroupsPanel.css';

type GroupField = 'name' | 'seriesCode';

export function GroupsPanel({ refreshKey, createOpen, entities, onRequestCreate, onCloseCreate }: { refreshKey: number; createOpen: boolean; entities: ReportingEntity[]; onRequestCreate: () => void; onCloseCreate: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [groups, setGroups] = useState<BusinessGroup[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [seriesCode, setSeriesCode] = useState('');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<GroupField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<BusinessGroup | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BusinessGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = isAdministratorRole(user?.role);
  const visibleGroups = (groups ?? []).filter((group) => {
    const term = query.trim().toLowerCase();
    return !term || group.name.toLowerCase().includes(term) || group.seriesCode.toLowerCase().includes(term);
  });

  const load = useCallback(() => {
    return groupApi.list().then((loaded) => { setLoadError(null); setGroups(loaded); }).catch((reason: unknown) => {
      setLoadError(reason instanceof ApiError ? reason.message : 'Unable to load groups.');
      setGroups([]);
    });
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const closeCreate = () => {
    setName(''); setSeriesCode(''); setActive(true); setErrors({}); setFormError(null); setEditing(null);
    onCloseCreate();
  };
  const openEdit = (group: BusinessGroup) => { setEditing(group); setName(group.name); setSeriesCode(group.seriesCode); setActive(group.active); setErrors({}); setFormError(null); onRequestCreate(); };
  const clearFieldError = (field: GroupField) => setErrors((current) => {
    const next = { ...current };
    delete next[field];
    return next;
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<GroupField, string>> = {};
    if (name.trim().length > 120) nextErrors.name = 'Group name must be 120 characters or fewer.';
    if (seriesCode.trim() && !/^[A-Za-z0-9-]+$/.test(seriesCode.trim())) nextErrors.seriesCode = 'Use only letters, numbers and hyphens.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true); setFormError(null);
    const request = editing ? groupApi.update(editing.id, { name: name.trim(), seriesCode: seriesCode.trim().toUpperCase(), active }) : groupApi.create({ name: name.trim(), seriesCode: seriesCode.trim().toUpperCase(), active });
    void request
      .then(() => { toast.success(editing ? 'Group updated successfully.' : 'Group created successfully.'); closeCreate(); return load(); })
      .catch((reason: unknown) => {
        if (reason instanceof ApiError) {
          setErrors(reason.toFieldMessages<GroupField>());
          setFormError(reason.message);
        } else setFormError('Unable to create group.');
      })
      .finally(() => setSaving(false));
  };
  const confirmDelete = () => { if (!pendingDelete || !isAdmin) return; setDeleting(true); void groupApi.remove(pendingDelete.id).then(() => { toast.success('Group deleted successfully.'); setPendingDelete(null); return load(); }).catch((reason: unknown) => toast.error(reason instanceof ApiError ? reason.message : 'Unable to delete group.')).finally(() => setDeleting(false)); };

  return <section className="groups-panel">
    {loadError && <Alert variant="danger">{loadError}</Alert>}
    {groups === null ? <LoadingState message="Loading groups…" /> : groups.length === 0 ? <EmptyState icon={<UsersIcon size={25} />} title="No groups configured" description="Create a group to organize related reporting entities." action={<Button leadingIcon={<PlusIcon />} onClick={onRequestCreate}>Create Group</Button>} /> : <>
      <div className="management-table-tools"><div className="management-table-tools__search"><TextInput id="group-table-search" type="search" placeholder="Search this table" leadingIcon={<SearchIcon />} value={query} onChange={(event) => setQuery(event.target.value)} /></div><span className="management-table-tools__count">{visibleGroups.length} / {groups.length}</span><Button size="sm" variant="secondary" leadingIcon={<SlidersIcon />}>Preferences</Button></div>
      {visibleGroups.length === 0 ? <EmptyState icon={<SearchIcon />} title="No matching groups" description="Try a different search." /> : <div className="groups-table-wrap"><table className="groups-table"><thead><tr><th>Name</th><th>Series Code</th><th>Status</th><th>Entities</th><th>Actions</th></tr></thead><tbody>{visibleGroups.map((group) => { const entityCount = entities.filter((entity) => entity.groupId === group.id).length; return <tr key={group.id}><td><div className="group-name-cell"><span><UsersIcon size={17} /></span><strong>{group.name}</strong></div></td><td><code>{group.seriesCode}</code></td><td><Badge tone={group.active ? 'success' : 'neutral'}>{group.active ? 'Active' : 'Inactive'}</Badge></td><td><Badge tone="accent">{entityCount} {entityCount === 1 ? 'Entity' : 'Entities'}</Badge></td><td className="management-table__actions"><div className="row-actions"><button type="button" aria-label="Edit" title="Edit" onClick={() => openEdit(group)}><EditIcon size={16} /></button><button type="button" aria-label={isAdmin ? 'Delete' : 'Only administrators can delete'} title={isAdmin ? 'Delete' : 'Only administrators can delete'} disabled={!isAdmin} onClick={() => setPendingDelete(group)}><TrashIcon size={16} /></button></div></td></tr>; })}</tbody></table></div>}
    </>}

    <Modal isOpen={createOpen} title={editing ? 'Edit Group' : 'Create Group'} description={editing ? 'Update this business group.' : 'Add a business group for organizing reporting entities.'} size="md" onClose={closeCreate} footer={<><Button variant="secondary" disabled={saving} onClick={closeCreate}>Cancel</Button><Button type="submit" form="create-group-form" isLoading={saving} leadingIcon={editing ? <EditIcon /> : <PlusIcon />}>{editing ? 'Save Changes' : 'Create Group'}</Button></>}>
      <form id="create-group-form" className="group-form" onSubmit={submit} autoComplete="off">
        {formError && <Alert variant="danger">{formError}</Alert>}
        <FormField htmlFor="group-name" label="Group Name" error={errors.name}><TextInput id="group-name" value={name} invalid={Boolean(errors.name)} maxLength={120} autoComplete="off" placeholder="Optional" onChange={(event) => { setName(event.target.value); clearFieldError('name'); }} /></FormField>
        <FormField htmlFor="group-series-code" label="Series Code" error={errors.seriesCode} hint="Optional. A draft code is generated when left blank."><TextInput id="group-series-code" value={seriesCode} invalid={Boolean(errors.seriesCode)} maxLength={12} autoCapitalize="characters" placeholder="Optional" onChange={(event) => { setSeriesCode(event.target.value.toUpperCase()); clearFieldError('seriesCode'); }} /></FormField>
        <Switch id="group-active" label="Active" description="Active groups are available when organizing entities." checked={active} onChange={setActive} />
      </form>
    </Modal>
    <ConfirmDialog isOpen={pendingDelete !== null} title={`Delete ${pendingDelete?.name ?? 'group'}?`} message="Entities in this group will be kept and moved out of the deleted group." confirmLabel="Delete" isDestructive isConfirming={deleting} onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
  </section>;
}

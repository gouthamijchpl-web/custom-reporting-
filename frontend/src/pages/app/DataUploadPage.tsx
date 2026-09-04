import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import { PlusIcon, SearchIcon, UploadIcon } from '@/components/icons';
import { Badge, Button, Modal, PageHeader, TextInput } from '@/components/ui';
import {
  analyzeImportFile, CURRENT_NORMALIZATION_VERSION, markFileDuplicates, migrateLegacyImportFile, remapImportFile,
} from '@/features/uploads/inventoryImport';
import type { ImportedInventoryFile, ImportContext, ImportKind, ImportRow, LegacyImportedFile } from '@/features/uploads/inventoryImport';
import { invalidateDailySalesCategorySource } from '@/features/reports/dailySalesCategoryReport';
import { useBranches, useEntities } from '@/hooks';
import { cx } from '@/utils/classNames';
import './DataUploadPage.css';

type UploadType = ImportKind;
type UploadsByType = Partial<Record<UploadType, ImportedInventoryFile[]>>;

interface UploadTypeDefinition {
  id: UploadType; label: string; description: string; templateColumns?: readonly string[];
  templateUrl?: string; templateFileName?: string;
}
interface StoredEntityUploads {
  entityId: string;
  uploadsByType: UploadsByType;
}
interface LoadedEntityUploads {
  uploadsByType: UploadsByType;
}

const UPLOAD_TYPES: readonly UploadTypeDefinition[] = [
  { id: 'opening-stock', label: 'Opening Stock', description: 'Item-wise opening quantities and values.', templateColumns: ['item_code', 'item_name', 'opening_quantity', 'unit', 'rate', 'opening_value', 'as_of_date'] },
  { id: 'sales', label: 'Sales', description: 'Item-wise sales invoice transactions.', templateUrl: '/templates/opening-sales-invoice-import-template.xlsx', templateFileName: 'opening-sales-invoice-import-template.xlsx' },
  { id: 'purchases', label: 'Purchase', description: 'Item-wise purchase bill transactions.', templateUrl: '/templates/opening-purchase-import-template.xlsx', templateFileName: 'opening-purchase-import-template.xlsx' },
];
const CREATE_UPLOAD_TYPES = UPLOAD_TYPES;
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'] as const;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 200;
const UPLOAD_DATABASE_NAME = 'custom-reporting-uploads';
const UPLOAD_STORE_NAME = 'entity-uploads';

function openUploadDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(UPLOAD_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(UPLOAD_STORE_NAME)) request.result.createObjectStore(UPLOAD_STORE_NAME, { keyPath: 'entityId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open upload storage.'));
  });
}
function isCurrentUpload(value: unknown): value is ImportedInventoryFile {
  if (!value || typeof value !== 'object') return false;
  const file = value as Partial<ImportedInventoryFile>;
  return typeof file.id === 'string' && typeof file.fileFingerprint === 'string' && Array.isArray(file.headers)
    && Array.isArray(file.rawRows) && Array.isArray(file.normalizedRows) && typeof file.mappingStatus === 'string';
}
function isLegacyUpload(value: unknown): value is LegacyImportedFile {
  if (!value || typeof value !== 'object') return false;
  const file = value as Partial<LegacyImportedFile>;
  return typeof file.id === 'string' && typeof file.fileName === 'string' && typeof file.fileSize === 'number' && Array.isArray(file.rows);
}
function sanitizeUploads(value: UploadsByType | undefined, context: ImportContext): UploadsByType {
  if (!value) return {};
  return Object.fromEntries(UPLOAD_TYPES.map(({ id }) => [id, (value[id] ?? []).flatMap((file) => {
    if (isCurrentUpload(file)) return [file.normalizationVersion === CURRENT_NORMALIZATION_VERSION
      ? file
      : remapImportFile(file, file.mapping, context)];
    if (isLegacyUpload(file)) {
      const migrated = migrateLegacyImportFile(id, file, context);
      return migrated ? [migrated] : [];
    }
    return [];
  })])) as UploadsByType;
}
function refreshDuplicateStatuses(value: UploadsByType): UploadsByType {
  const files = markFileDuplicates(UPLOAD_TYPES.flatMap(({ id }) => value[id] ?? []));
  return Object.fromEntries(UPLOAD_TYPES.map(({ id }) => [id, files.filter((file) => file.kind === id)])) as UploadsByType;
}
async function loadEntityUploads(entityId: string, context: ImportContext): Promise<LoadedEntityUploads> {
  const database = await openUploadDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(UPLOAD_STORE_NAME, 'readonly');
    const request = transaction.objectStore(UPLOAD_STORE_NAME).get(entityId);
    request.onsuccess = () => {
      const stored = request.result as StoredEntityUploads | undefined;
      resolve({
        uploadsByType: refreshDuplicateStatuses(sanitizeUploads(stored?.uploadsByType, context)),
      });
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to restore uploaded files.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Unable to restore uploaded files.')); };
  });
}
async function saveEntityUploads(entityId: string, uploadsByType: UploadsByType): Promise<void> {
  const database = await openUploadDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(UPLOAD_STORE_NAME, 'readwrite');
    const storedRecord: StoredEntityUploads = { entityId, uploadsByType };
    transaction.objectStore(UPLOAD_STORE_NAME).put(storedRecord);
    transaction.oncomplete = () => { database.close(); invalidateDailySalesCategorySource(entityId); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Unable to save uploaded files.')); };
  });
}
function getUploadType(id: UploadType) { return UPLOAD_TYPES.find((type) => type.id === id) ?? UPLOAD_TYPES[0]; }
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function formatCell(value: unknown) { if (value == null) return ''; if (value instanceof Date) return new Intl.DateTimeFormat().format(value); return String(value); }
function importedColumnClass(header: string) {
  return /description|particular|notes|address|customer|buyer|vendor|supplier|entity|company/i.test(header)
    ? 'upload-preview__text-column'
    : undefined;
}
function statusTone(value: string): 'success' | 'warning' | 'neutral' {
  if (value === 'Unique') return 'success';
  if (value.includes('duplicate')) return 'warning';
  return 'neutral';
}

function UploadSelectorIcon({ type }: { type: UploadType }) {
  return <svg className="data-upload-actions__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {type === 'opening-stock' ? <>
      <path d="m4 7.5 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7.5v9l8 4 8-4v-9" />
      <path d="M12 11.5v9" />
    </> : type === 'sales' ? <>
      <path d="M4 18 10 12l4 4 6-8" />
      <path d="M15 8h5v5" />
    </> : <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </>}
  </svg>;
}

function UploadedDataTable({ file, title }: { file: ImportedInventoryFile; title: string }) {
  const [query, setQuery] = useState('');
  const [columnQuery, setColumnQuery] = useState('');
  const columnHeaderRefs = useRef<Array<HTMLTableCellElement | null>>([]);
  const deferredQuery = useDeferredValue(query);
  const deferredColumnQuery = useDeferredValue(columnQuery);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase();
  const normalizedColumnQuery = deferredColumnQuery.trim().toLocaleLowerCase();
  const rowSearchResult = useMemo(() => {
    if (!normalizedQuery) return {
      count: file.rawRows.length,
      rows: file.rawRows.slice(0, MAX_PREVIEW_ROWS).map((row, sourceIndex) => ({ row, sourceIndex })),
    };
    let count = 0;
    const rows: Array<{ row: ImportRow; sourceIndex: number }> = [];
    file.rawRows.forEach((row, sourceIndex) => {
      const matches = row.some((value) => formatCell(value).toLocaleLowerCase().includes(normalizedQuery));
      if (!matches) return;
      count += 1;
      if (rows.length < MAX_PREVIEW_ROWS) rows.push({ row, sourceIndex });
    });
    return { count, rows };
  }, [file.rawRows, normalizedQuery]);
  const visibleRows = rowSearchResult.rows;
  const matchingColumnIndices = useMemo(() => new Set(file.headers.flatMap((header, index) => (
    normalizedColumnQuery && header.toLocaleLowerCase().includes(normalizedColumnQuery) ? [index] : []
  ))), [file.headers, normalizedColumnQuery]);
  useEffect(() => {
    if (!normalizedColumnQuery) return;
    const firstMatch = matchingColumnIndices.values().next().value;
    if (firstMatch == null) return;
    columnHeaderRefs.current[firstMatch]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [matchingColumnIndices, normalizedColumnQuery]);
  const resultLabel = normalizedQuery
    ? rowSearchResult.count > MAX_PREVIEW_ROWS ? `First ${MAX_PREVIEW_ROWS} of ${rowSearchResult.count} matches` : `${rowSearchResult.count} ${rowSearchResult.count === 1 ? 'match' : 'matches'}`
    : file.rawRows.length > MAX_PREVIEW_ROWS ? `First ${MAX_PREVIEW_ROWS} of ${file.rawRows.length} rows` : `${file.rawRows.length} rows`;
  const columnResultLabel = normalizedColumnQuery
    ? matchingColumnIndices.size === 0 ? 'No columns found' : `${matchingColumnIndices.size} ${matchingColumnIndices.size === 1 ? 'column' : 'columns'}`
    : null;

  return <section className="upload-preview">
    <header className="upload-preview__header"><div><h3>{title}</h3><p>{file.fileName} · {file.sourceSheet} · header row {file.headerRow + 1}</p></div>
      <div className="upload-preview__badges"><Badge tone={statusTone(file.duplicateStatus)}>{file.duplicateStatus}</Badge><Badge tone="neutral" className="upload-preview__row-count-badge">{resultLabel}</Badge></div>
    </header>
    <div className="upload-preview__search">
      <TextInput id={`upload-table-search-${file.id}`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} leadingIcon={<SearchIcon size={16} />} placeholder="Search rows" aria-label={`Search rows in ${title}`} />
      <TextInput id={`upload-column-search-${file.id}`} type="search" value={columnQuery} onChange={(event) => setColumnQuery(event.target.value)} leadingIcon={<SearchIcon size={16} />} placeholder="Search column names" aria-label={`Search column names in ${title}`} />
      {columnResultLabel && <span className={cx('upload-preview__column-result', matchingColumnIndices.size === 0 && 'upload-preview__column-result--empty')} aria-live="polite">{columnResultLabel}</span>}
    </div>
    <div className="upload-preview__table-wrap"><table className="upload-preview__table">
      <thead><tr><th className="upload-preview__row-number">#</th>{file.headers.map((header, index) => <th ref={(element) => { columnHeaderRefs.current[index] = element; }} className={cx(importedColumnClass(header), matchingColumnIndices.has(index) && 'upload-preview__column-match')} key={`${header}-${index}`}>{header}</th>)}</tr></thead>
      <tbody>{visibleRows.length > 0 ? visibleRows.map(({ row, sourceIndex }) => <tr key={sourceIndex}><th className="upload-preview__row-number" scope="row">{sourceIndex + 1}</th>{file.headers.map((header, columnIndex) => <td className={cx(importedColumnClass(header), matchingColumnIndices.has(columnIndex) && 'upload-preview__column-match')} key={columnIndex}>{formatCell(row[columnIndex])}</td>)}</tr>) : <tr><td className="upload-preview__no-results" colSpan={file.headers.length + 1}>No rows match “{query.trim()}”.</td></tr>}</tbody>
    </table></div>
  </section>;
}

export function DataUploadPage() {
  const { selectedEntity } = useEntities();
  const { status: branchStatus, selectableBranches, selectedBranch, errorMessage: branchErrorMessage } = useBranches();
  const selectedEntityId = selectedEntity?.id ?? null;
  const uploadScopeId = selectedEntityId && branchStatus === 'ready' ? (selectableBranches.length === 0 ? selectedEntityId : selectedBranch ? `${selectedEntityId}:branch:${selectedBranch.id}` : null) : null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRequestRef = useRef(0);
  const storageRequestRef = useRef(0);
  const storageSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  const [createOpen, setCreateOpen] = useState(false);
  const [activeType, setActiveType] = useState<UploadType>('sales');
  const [visibleType, setVisibleType] = useState<UploadType>('opening-stock');
  const [fileError, setFileError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadsByType, setUploadsByType] = useState<UploadsByType>({});
  const [loadedScopeId, setLoadedScopeId] = useState<string | null>(null);
  const [storageAvailableScopeId, setStorageAvailableScopeId] = useState<string | null>(null);
  const [storageIssue, setStorageIssue] = useState<{ scopeId: string; message: string } | null>(null);
  const [replaceUploadId, setReplaceUploadId] = useState<string | null>(null);
  const type = getUploadType(activeType);
  const currentScopeUploads = useMemo<UploadsByType>(
    () => loadedScopeId === uploadScopeId ? uploadsByType : {},
    [loadedScopeId, uploadScopeId, uploadsByType],
  );
  const activeUploads = currentScopeUploads[activeType] ?? [];
  const visibleUploads = currentScopeUploads[visibleType] ?? [];
  const storageLoading = selectedEntityId !== null && (uploadScopeId === null || loadedScopeId !== uploadScopeId);
  const storageError = storageIssue?.scopeId === uploadScopeId ? storageIssue.message : null;

  useEffect(() => {
    const requestId = ++storageRequestRef.current;
    if (!uploadScopeId) return;
    if (!selectedEntity) return;
    void loadEntityUploads(uploadScopeId, { entity: selectedEntity, branch: selectedBranch }).then((stored) => {
      if (storageRequestRef.current !== requestId) return;
      setUploadsByType(stored.uploadsByType); setLoadedScopeId(uploadScopeId); setStorageAvailableScopeId(uploadScopeId); setStorageIssue(null);
    }).catch(() => {
      if (storageRequestRef.current !== requestId) return;
      setUploadsByType({}); setLoadedScopeId(uploadScopeId); setStorageAvailableScopeId(null);
      setStorageIssue({ scopeId: uploadScopeId, message: 'Uploaded files could not be restored in this browser.' });
    });
  }, [selectedBranch, selectedEntity, uploadScopeId]);
  useEffect(() => {
    if (!uploadScopeId || storageAvailableScopeId !== uploadScopeId) return;
    storageSaveChainRef.current = storageSaveChainRef.current.catch(() => undefined).then(() => saveEntityUploads(uploadScopeId, uploadsByType)).catch(() => setStorageIssue({ scopeId: uploadScopeId, message: 'Uploaded files could not be saved for the next refresh.' }));
  }, [storageAvailableScopeId, uploadScopeId, uploadsByType]);

  const resetWorkflow = () => { importRequestRef.current += 1; setActiveType('sales'); setFileError(null); setImportLoading(false); setDragging(false); setReplaceUploadId(null); };
  const openCreate = (uploadType: UploadType) => { resetWorkflow(); setActiveType(uploadType); setCreateOpen(true); };
  const closeCreate = () => { setCreateOpen(false); resetWorkflow(); };
  const chooseType = (nextType: UploadType) => { importRequestRef.current += 1; setActiveType(nextType); setFileError(null); setImportLoading(false); setReplaceUploadId(null); };
  const updateUploads = (updater: (current: UploadsByType) => UploadsByType) => { setUploadsByType((current) => refreshDuplicateStatuses(updater(current))); };
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + CREATE_UPLOAD_TYPES.length) % CREATE_UPLOAD_TYPES.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % CREATE_UPLOAD_TYPES.length;
    if (event.key === 'Home') nextIndex = 0; if (event.key === 'End') nextIndex = CREATE_UPLOAD_TYPES.length - 1;
    const nextType = CREATE_UPLOAD_TYPES[nextIndex]; chooseType(nextType.id); document.getElementById(`upload-type-tab-${nextType.id}`)?.focus();
  };
  const handleSelectorKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + UPLOAD_TYPES.length) % UPLOAD_TYPES.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % UPLOAD_TYPES.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = UPLOAD_TYPES.length - 1;
    const nextType = UPLOAD_TYPES[nextIndex];
    setVisibleType(nextType.id);
    document.getElementById(`data-upload-selector-${nextType.id}`)?.focus();
  };
  const removeUpload = (uploadType: UploadType, uploadId: string) => {
    updateUploads((current) => ({ ...current, [uploadType]: (current[uploadType] ?? []).filter((file) => file.id !== uploadId) }));
  };
  const acceptFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0 || !selectedEntity) return;
    const uploadType = activeType; const replacementId = replaceUploadId; const errors: string[] = [];
    const validFiles = selectedFiles.filter((file) => {
      if (!ACCEPTED_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension))) { errors.push(`${file.name}: choose a CSV or XLSX file.`); return false; }
      if (file.size > MAX_FILE_SIZE) { errors.push(`${file.name}: file must be 25 MB or smaller.`); return false; } return true;
    });
    setReplaceUploadId(null);
    if (validFiles.length === 0) { setFileError(errors.join(' ')); return; }
    const requestId = ++importRequestRef.current; setFileError(errors.length > 0 ? errors.join(' ') : null); setImportLoading(true);
    const parsedUploads: ImportedInventoryFile[] = [];
    for (const file of validFiles) {
      try {
        const upload = await analyzeImportFile(uploadType, file, { entity: selectedEntity, branch: selectedBranch });
        if (importRequestRef.current !== requestId) return;
        if (upload.rawRows.length === 0) errors.push(`${file.name}: no data rows were found after the detected header.`); else parsedUploads.push(upload);
      } catch { errors.push(`${file.name}: could not read this spreadsheet.`); }
    }
    if (importRequestRef.current !== requestId) return;
    if (parsedUploads.length > 0) {
      updateUploads((current) => ({ ...current, [uploadType]: [...(current[uploadType] ?? []).filter((file) => file.id !== replacementId), ...parsedUploads] }));
      setVisibleType(uploadType);
    }
    setFileError(errors.length > 0 ? errors.join(' ') : null); setImportLoading(false);
  };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => { void acceptFiles(Array.from(event.target.files ?? [])); event.target.value = ''; };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); setReplaceUploadId(null); void acceptFiles(Array.from(event.dataTransfer.files)); };
  const startReplace = (uploadId: string) => { setReplaceUploadId(uploadId); fileInputRef.current?.click(); };
  const downloadTemplate = () => {
    if (type.templateUrl) { const link = document.createElement('a'); link.href = type.templateUrl; link.download = type.templateFileName ?? `${type.id}-template.xlsx`; document.body.appendChild(link); link.click(); link.remove(); return; }
    const url = URL.createObjectURL(new Blob([`${(type.templateColumns ?? []).join(',')}\n`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${type.id}-item-wise-template.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  return <div className="data-upload-page">
    <PageHeader title="Data Upload" />
    {!selectedEntity && <div className="data-upload-page__notice" role="status">Select an active entity from the header before uploading a file.</div>}
    {selectedEntity && branchStatus === 'error' && <div className="data-upload-page__notice" role="alert">{branchErrorMessage ?? 'Branches could not be loaded. Open the Branch selector to retry.'}</div>}
    {storageError && <div className="data-upload-page__notice" role="alert">{storageError}</div>}
    <div className="data-upload-controls"><div className="data-upload-actions" role="tablist" aria-label="Choose data upload type">{UPLOAD_TYPES.map((item, index) => <button key={item.id} type="button" role="tab" id={`data-upload-selector-${item.id}`} aria-selected={visibleType === item.id} tabIndex={visibleType === item.id ? 0 : -1} className={cx('data-upload-actions__tab', visibleType === item.id && 'data-upload-actions__tab--active')} onClick={() => setVisibleType(item.id)} onKeyDown={(event) => handleSelectorKeyDown(event, index)} disabled={!selectedEntity || storageLoading}><UploadSelectorIcon type={item.id} /><span>{item.label}</span></button>)}</div><Button size="sm" leadingIcon={visibleType === 'opening-stock' ? <UploadIcon size={16} /> : <PlusIcon size={16} />} onClick={() => openCreate(visibleType)} disabled={!selectedEntity || storageLoading}>{visibleType === 'opening-stock' ? 'Upload file' : 'Create'}</Button></div>
    {selectedEntity && branchStatus !== 'error' && (storageLoading ? <div className="data-upload-result__empty" role="status">{branchStatus === 'loading' ? 'Loading client branches…' : 'Restoring uploaded files…'}</div>
      : visibleUploads.length > 0 ? <div className="data-upload-result">{visibleUploads.map((file) => <UploadedDataTable key={file.id} file={file} title={`${getUploadType(visibleType).label} data`} />)}</div>
        : <div className="data-upload-result__empty" role="status">No {getUploadType(visibleType).label.toLowerCase()} file uploaded yet. Use {visibleType === 'opening-stock' ? 'Upload file' : 'Create'} to upload one.</div>)}

    <Modal isOpen={createOpen} title="Upload data" description="Choose a data type and upload one or more files. Tables appear on the Data Upload page after closing." onClose={closeCreate} footer={<Button variant="secondary" onClick={closeCreate}>Close</Button>} size="xl">
      <div className="upload-type-tabs" role="tablist" aria-label="Data upload type">{CREATE_UPLOAD_TYPES.map((item, index) => <button key={item.id} type="button" role="tab" id={`upload-type-tab-${item.id}`} aria-selected={activeType === item.id} aria-controls={`upload-type-panel-${item.id}`} tabIndex={activeType === item.id ? 0 : -1} className={cx('upload-type-tabs__tab', activeType === item.id && 'upload-type-tabs__tab--active')} onClick={() => chooseType(item.id)} onKeyDown={(event) => handleTabKeyDown(event, index)}><span>{item.label}</span><small>{item.description}</small></button>)}</div>
      <div className="item-wise-workflow" role="tabpanel" id={`upload-type-panel-${activeType}`} aria-labelledby={`upload-type-tab-${activeType}`}><div className="upload-workflow-panel">
        <div className="upload-workflow-panel__heading"><div><Badge tone="accent">Item-wise</Badge><h3>Upload {type.label.toLowerCase()} files</h3><p>Headers can be on any of the first 20 rows in any sheet. CSV and XLSX files up to 25 MB each are supported.</p></div><Button variant="secondary" size="sm" onClick={downloadTemplate}>Download template</Button></div>
        <div className={cx('file-dropzone', dragging && 'file-dropzone--dragging', fileError && 'file-dropzone--error')} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={handleDrop}>
          <input ref={fileInputRef} type="file" className="sr-only" accept=".csv,.xlsx" multiple onChange={handleFileChange} aria-label={`Choose ${type.label} files`} /><span className="file-dropzone__icon"><UploadIcon size={24} /></span><strong>Drop your files here</strong><span>or choose files from your computer</span><Button variant="secondary" size="sm" onClick={() => { setReplaceUploadId(null); fileInputRef.current?.click(); }}>Choose files</Button>
        </div>
        {fileError && <p className="file-dropzone__error" role="alert">{fileError}</p>}{importLoading && <div className="upload-preview__loading" role="status">Reading worksheets and detecting columns…</div>}
        {activeUploads.length > 0 && <section className="uploaded-file-list" aria-labelledby="uploaded-file-list-title"><header className="uploaded-file-list__header"><h3 id="uploaded-file-list-title">Uploaded files</h3><Badge tone="success" withDot>{activeUploads.length} uploaded</Badge></header><ul>{activeUploads.map((file) => <li key={file.id}><span className="uploaded-file-list__icon" aria-hidden="true"><UploadIcon size={17} /></span><span className="uploaded-file-list__details"><strong>{file.fileName}</strong><small>{formatFileSize(file.fileSize)} · {file.sourceSheet} · {file.rawRows.length} rows</small><span className="uploaded-file-list__statuses"><Badge tone={statusTone(file.duplicateStatus)}>{file.duplicateStatus}</Badge></span></span><span className="uploaded-file-list__actions"><Button variant="ghost" size="sm" onClick={() => startReplace(file.id)}>Replace</Button><Button variant="ghost" size="sm" className="uploaded-file-list__remove" onClick={() => removeUpload(activeType, file.id)}>Remove</Button></span></li>)}</ul></section>}
        <p className="upload-workflow-panel__entity">Active client: <strong>{selectedEntity?.name ?? 'No client selected'}</strong>{selectedBranch && <> · Branch: <strong>{selectedBranch.name}</strong></>}</p>
      </div></div>
    </Modal>
  </div>;
}

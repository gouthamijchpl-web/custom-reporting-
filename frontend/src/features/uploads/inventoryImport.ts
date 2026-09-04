import type { EntityBranch, ReportingEntity } from '@/types';

export type ImportKind = 'opening-stock' | 'sales' | 'purchases';
export type ImportCell = string | number | boolean | Date | typeof Date | null;
export type ImportRow = ImportCell[];
export type ColumnMapping = Record<string, number | null>;

export interface ImportContext {
  entity: ReportingEntity;
  branch: EntityBranch | null;
}

export interface ImportFieldDefinition {
  key: string;
  label: string;
  aliases: readonly string[];
  required?: boolean;
}

export interface NormalizedInventoryRecord {
  transactionType: ImportKind;
  entityId: string;
  branchId: string | null;
  branchName: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  status: string;
  statusCategory: 'finalized' | 'draft' | 'excluded';
  entityCode: string;
  entityName: string;
  entityGstin: string;
  vendorName: string;
  vendorGstin: string;
  itemCode: string;
  articleCode: string;
  skuCode: string;
  finalProductType: string;
  productCategory: string;
  style: string;
  description: string;
  uom: string;
  quantity: number | null;
  salesRate: number | null;
  purchasePrice: number | null;
  rate: number | null;
  taxableValue: number | null;
  receivedQuantity: number | null;
  acceptedQuantity: number | null;
  rejectedQuantity: number | null;
  lineNumber: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
  importBatchId: string;
  rawRow: Record<string, ImportCell>;
  inventoryKey: string | null;
  transactionKey: string;
  validationIssues: string[];
}

export interface ImportedInventoryFile {
  id: string;
  batchId: string;
  kind: ImportKind;
  fileName: string;
  fileSize: number;
  fileFingerprint: string;
  sourceSheet: string;
  headerRow: number;
  headers: string[];
  rawRows: ImportRow[];
  mapping: ColumnMapping;
  templateSignature: string;
  mappingStatus: 'Mapped' | 'Needs mapping';
  validationStatus: string;
  duplicateStatus: string;
  normalizedRows: NormalizedInventoryRecord[];
  issues: string[];
  normalizationVersion: number;
}

export interface LegacyImportedFile {
  id: string;
  fileName: string;
  fileSize: number;
  rows: ImportRow[];
}

export interface OpeningStockRow {
  inventoryKey: string;
  entity: string;
  gstin: string;
  skuCode: string;
  articleCode: string;
  itemCode: string;
  description: string;
  uom: string;
  openingQuantity: number;
  averageCost: number;
  openingValue: number;
  purchaseQtyBeforeDate: number;
  salesQtyBeforeDate: number;
  sourceStatus: string;
  warningStatus: string;
}

export interface OpeningStockSummary {
  salesFilesUploaded: number;
  purchaseFilesUploaded: number;
  salesRowsAccepted: number;
  purchaseRowsAccepted: number;
  excludedStatusRows: number;
  duplicateRowsExcluded: number;
  rowsNeedingMapping: number;
  unknownSkuRows: number;
  uomConflicts: number;
  negativeStockItems: number;
}

export interface OpeningStockResult {
  rows: OpeningStockRow[];
  summary: OpeningStockSummary;
  blockingIssues: string[];
}

const COMMON_ITEM_FIELDS: readonly ImportFieldDefinition[] = [
  { key: 'entityName', label: 'Entity Name', aliases: ['entity name', 'company name', 'buyer name', 'factory name'] },
  { key: 'entityGstin', label: 'Entity GSTIN', aliases: ['entity gstin', 'factory gstin', 'buyer gstin', 'company gstin', 'gstin'] },
  {
    key: 'finalProductType',
    label: 'Final Product Type',
    aliases: ['final product type'],
  },
  { key: 'productCategory', label: 'Product / Category', aliases: ['product', 'product category', 'category', 'item category', 'product group', 'stock group'] },
  { key: 'style', label: 'Style', aliases: ['style', 'style code', 'style no', 'style number', 'design style'] },
  { key: 'itemCode', label: 'Item Code', aliases: ['item code', 'stock code', 'stock no', 'stock number', 'product code', 'material code'] },
  { key: 'articleCode', label: 'Article Code', aliases: ['article code', 'fabric article code', 'product article code'] },
  { key: 'skuCode', label: 'SKU Code', aliases: ['sku', 'sku code', 'product sku', 'item sku', 'stock keeping unit', 'fabric sku code', 'fg sku'] },
  { key: 'description', label: 'Description', aliases: ['description', 'item description', 'product description', 'particulars'] },
  { key: 'uom', label: 'UOM', aliases: ['uom', 'unit', 'unit of measure', 'units'] },
  { key: 'quantity', label: 'Quantity', required: true, aliases: ['quantity', 'qty', 'sales qty', 'purchase qty', 'invoice qty', 'invoice quantity', 'sold quantity', 'purchase quantity', 'opening quantity'] },
];

const SALES_FIELDS: readonly ImportFieldDefinition[] = [
  { key: 'invoiceNumber', label: 'Invoice Number', aliases: ['sales invoice number', 'sales invoice no', 'invoice number', 'invoice no', 'voucher number', 'voucher no', 'bill number', 'bill no'] },
  { key: 'invoiceDate', label: 'Invoice Date', required: true, aliases: ['invoice date', 'voucher date', 'bill date', 'sales date', 'transaction date', 'date'] },
  { key: 'status', label: 'Invoice Status', aliases: ['sales invoice status', 'invoice status', 'status'] },
  { key: 'entityCode', label: 'Entity Code', aliases: ['entity code', 'company code', 'factory code'] },
  ...COMMON_ITEM_FIELDS,
  { key: 'salesRate', label: 'Sales Rate', aliases: ['sales rate', 'selling rate', 'rate', 'unit price'] },
  { key: 'purchasePrice', label: 'Purchase / Cost Price', aliases: ['purchase price', 'cost price', 'purchase cost', 'unit purchase cost', 'unit cost', 'cogs rate'] },
  { key: 'taxableValue', label: 'Taxable Value', aliases: ['taxable value', 'invoice value', 'line value', 'value', 'net value'] },
  { key: 'lineNumber', label: 'Line Number', aliases: ['sales invoice line number', 'line number', 'line no', 'item line'] },
];

const PURCHASE_FIELDS: readonly ImportFieldDefinition[] = [
  { key: 'invoiceNumber', label: 'Invoice Number', aliases: ['invoice number', 'invoice no', 'voucher number', 'voucher no', 'supplier invoice number', 'supplier invoice no', 'purchase invoice number', 'bill number', 'bill no'] },
  { key: 'invoiceDate', label: 'Invoice Date', required: true, aliases: ['invoice date', 'voucher date', 'bill date', 'purchase date', 'transaction date', 'date'] },
  { key: 'status', label: 'Status', aliases: ['purchase status', 'invoice status', 'status'] },
  ...COMMON_ITEM_FIELDS,
  { key: 'vendorName', label: 'Vendor Name', aliases: ['vendor name', 'supplier name', 'fabric vendor', 'party name'] },
  { key: 'vendorGstin', label: 'Vendor GSTIN', aliases: ['vendor gstin', 'supplier gstin', 'party gstin'] },
  { key: 'rate', label: 'Purchase Rate', aliases: ['purchase rate', 'rate', 'unit rate', 'unit price', 'price'] },
  { key: 'taxableValue', label: 'Purchase Value', aliases: ['taxable value', 'purchase taxable amount', 'item base value', 'inventory purchase value', 'purchase value', 'line value', 'value', 'net value'] },
  { key: 'receivedQuantity', label: 'Received Quantity', aliases: ['received quantity', 'received qty', 'receipt quantity'] },
  { key: 'acceptedQuantity', label: 'Accepted Quantity', aliases: ['accepted quantity', 'accepted qty'] },
  { key: 'rejectedQuantity', label: 'Rejected Quantity', aliases: ['rejected quantity', 'rejected qty'] },
  { key: 'lineNumber', label: 'Line Number', aliases: ['line number', 'line no', 'purchase line number', 'item line'] },
];

const OPENING_FIELDS: readonly ImportFieldDefinition[] = [
  { key: 'invoiceDate', label: 'As On Date', required: true, aliases: ['as of date', 'as on date', 'opening date', 'date'] },
  ...COMMON_ITEM_FIELDS,
  { key: 'rate', label: 'Opening Rate', aliases: ['opening rate', 'average cost', 'rate', 'cost'] },
  { key: 'taxableValue', label: 'Opening Value', aliases: ['opening value', 'stock value', 'inventory value', 'value'] },
];

const FIELDS: Record<ImportKind, readonly ImportFieldDefinition[]> = {
  'opening-stock': OPENING_FIELDS,
  sales: SALES_FIELDS,
  purchases: PURCHASE_FIELDS,
};

const FINALIZED_STATUSES = new Set(['submitted', 'approved', 'posted', 'completed', 'finalized', 'final', 'processed']);
const DRAFT_STATUSES = new Set(['draft']);
const EXCLUDED_STATUSES = new Set(['cancelled', 'canceled', 'void', 'rejected', 'deleted']);
const MAPPING_STORAGE_KEY = 'custom-reporting.inventory-import-mappings';
export const CURRENT_NORMALIZATION_VERSION = 2;

export function getImportFields(kind: ImportKind): readonly ImportFieldDefinition[] {
  return FIELDS[kind];
}

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9% ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeReportingProduct(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase();
}

function finalProductTypeHeaderIndex(headers: string[]): number {
  return headers.indexOf('final product type');
}

function headerScore(header: string, alias: string): number {
  const left = normalizeHeader(header);
  const right = normalizeHeader(alias);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if ((left.includes(right) || right.includes(left)) && Math.min(left.length, right.length) >= 4) return 0.86;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union > 0 ? (intersection / union) * 0.8 : 0;
}

export function autoMapHeaders(kind: ImportKind, headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const normalizedHeaders = headers.map(normalizeHeader);
  for (const field of FIELDS[kind]) {
    if (field.key === 'finalProductType') {
      const preferredIndex = finalProductTypeHeaderIndex(normalizedHeaders);
      mapping[field.key] = preferredIndex >= 0 ? preferredIndex : null;
      if (preferredIndex >= 0) used.add(preferredIndex);
      continue;
    }
    let bestIndex: number | null = null;
    let bestScore = 0;
    headers.forEach((header, index) => {
      if (used.has(index)) return;
      if (field.key === 'productCategory' && normalizedHeaders[index] === 'final product type') return;
      if (field.key === 'status' && normalizeHeader(header).includes('cost status')) return;
      const score = Math.max(...field.aliases.map((alias) => headerScore(header, alias)));
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    mapping[field.key] = bestScore >= 0.74 ? bestIndex : null;
    if (mapping[field.key] !== null) used.add(mapping[field.key]!);
  }
  return mapping;
}

function hasRequiredMapping(mapping: ColumnMapping): boolean {
  const hasItem = mapping.skuCode != null || mapping.articleCode != null || mapping.itemCode != null;
  return mapping.invoiceDate != null && mapping.quantity != null && hasItem;
}

function signatureFor(kind: ImportKind, headers: string[]): string {
  return `${kind}:${headers.map(normalizeHeader).sort().join('|')}`;
}

function readSavedMappings(): Record<string, Record<string, string | null>> {
  try {
    return JSON.parse(window.localStorage.getItem(MAPPING_STORAGE_KEY) ?? '{}') as Record<string, Record<string, string | null>>;
  } catch {
    return {};
  }
}

function applySavedMapping(signature: string, headers: string[], fallback: ColumnMapping): ColumnMapping {
  const saved = readSavedMappings()[signature];
  if (!saved) return fallback;
  const normalizedHeaders = headers.map(normalizeHeader);
  const applied = Object.fromEntries(Object.entries(fallback).map(([field, defaultIndex]) => {
    if (!Object.hasOwn(saved, field)) return [field, defaultIndex];
    const savedHeader = saved[field];
    if (!savedHeader) return [field, null];
    const index = normalizedHeaders.indexOf(savedHeader);
    return [field, index >= 0 ? index : defaultIndex];
  }));
  if (!Object.hasOwn(saved, 'productCategory')
    && applied.productCategory === applied.itemCode
    && fallback.itemCode != null) applied.itemCode = fallback.itemCode;
  if (!Object.hasOwn(saved, 'finalProductType')) {
    applied.finalProductType = fallback.finalProductType;
    if (applied.productCategory === applied.finalProductType && fallback.productCategory !== applied.finalProductType) {
      applied.productCategory = fallback.productCategory;
    }
  }
  const exactFinalProductTypeIndex = finalProductTypeHeaderIndex(normalizedHeaders);
  if (exactFinalProductTypeIndex >= 0) {
    applied.finalProductType = exactFinalProductTypeIndex;
    if (applied.productCategory === exactFinalProductTypeIndex && fallback.productCategory !== exactFinalProductTypeIndex) {
      applied.productCategory = fallback.productCategory;
    }
  }
  if (!Object.hasOwn(saved, 'purchasePrice')
    && applied.purchasePrice === applied.salesRate
    && fallback.salesRate !== fallback.purchasePrice) applied.salesRate = fallback.salesRate;
  const mappedStatusHeader = applied.status == null ? '' : normalizedHeaders[applied.status] ?? '';
  if (mappedStatusHeader.includes('cost status')) applied.status = fallback.status;
  return applied;
}

export function saveReusableMapping(file: ImportedInventoryFile, mapping: ColumnMapping): void {
  const all = readSavedMappings();
  all[file.templateSignature] = Object.fromEntries(
    Object.entries(mapping).map(([field, index]) => [field, index == null ? null : normalizeHeader(file.headers[index])]),
  );
  try {
    window.localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Mapping still applies to the current file when browser persistence is unavailable.
  }
}

function headerCandidateScore(kind: ImportKind, row: ImportRow): number {
  const headers = row.map((cell) => String(cell ?? ''));
  const mapping = autoMapHeaders(kind, headers);
  const mapped = Object.values(mapping).filter((index) => index != null).length;
  const required = hasRequiredMapping(mapping) ? 8 : 0;
  const textCells = headers.filter((header) => /[a-z]/i.test(header)).length;
  return mapped * 2 + required + Math.min(textCells, 10) * 0.1;
}

function parseCsv(contents: string): ImportRow[] {
  const rows: ImportRow[] = [];
  let row: ImportRow = [];
  let cell = '';
  let quoted = false;
  const source = contents.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => String(value ?? '').trim() !== ''));
}

async function readSheets(file: File): Promise<Array<{ sheet: string; data: ImportRow[] }>> {
  if (file.name.toLowerCase().endsWith('.csv')) return [{ sheet: 'CSV', data: parseCsv(await file.text()) }];
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  return readXlsxFile(file) as Promise<Array<{ sheet: string; data: ImportRow[] }>>;
}

async function fileFingerprint(file: File): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function textValue(row: ImportRow, mapping: ColumnMapping, field: string): string {
  const index = mapping[field];
  return index == null ? '' : String(row[index] ?? '').trim();
}

function numberValue(row: ImportRow, mapping: ColumnMapping, field: string): number | null {
  const index = mapping[field];
  const raw = index == null ? null : row[index];
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (raw == null || raw === '') return null;
  const text = String(raw).trim();
  const negative = /^\(.*\)$/.test(text);
  const parsed = Number(text.replace(/[^\d.,()-]/g, '').replace(/[(),]/g, ''));
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : null;
}

function dateValue(row: ImportRow, mapping: ColumnMapping): string | null {
  const index = mapping.invoiceDate;
  const raw = index == null ? null : row[index];
  let date: Date | null = null;
  if (raw instanceof Date) date = raw;
  else if (typeof raw === 'number' && raw > 10_000 && raw < 100_000) date = new Date(Math.round((raw - 25_569) * 86_400_000));
  else if (raw != null) {
    const text = String(raw).trim();
    const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    const yearFirst = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(text);
    if (dayFirst) date = new Date(Date.UTC(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1])));
    else if (yearFirst) date = new Date(Date.UTC(Number(yearFirst[1]), Number(yearFirst[2]) - 1, Number(yearFirst[3])));
    else {
      const timestamp = Date.parse(text);
      if (Number.isFinite(timestamp)) date = new Date(timestamp);
    }
  }
  return date && !Number.isNaN(date.valueOf()) ? date.toISOString().slice(0, 10) : null;
}

export function normalizeUom(value: string): string {
  const normalized = normalizeHeader(value).replace(/\s/g, '');
  if (['mtr', 'mtrs', 'meter', 'meters', 'metre', 'metres'].includes(normalized)) return 'MTR';
  if (['pc', 'pcs', 'piece', 'pieces', 'nos', 'no'].includes(normalized)) return 'PCS';
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(normalized)) return 'KG';
  if (['gm', 'gms', 'gram', 'grams'].includes(normalized)) return 'GM';
  if (['ltr', 'ltrs', 'liter', 'liters', 'litre', 'litres'].includes(normalized)) return 'LTR';
  return normalized.toUpperCase();
}

function statusCategory(value: string): NormalizedInventoryRecord['statusCategory'] {
  const normalized = normalizeHeader(value);
  if (!normalized || FINALIZED_STATUSES.has(normalized)) return 'finalized';
  if (DRAFT_STATUSES.has(normalized)) return 'draft';
  if (EXCLUDED_STATUSES.has(normalized)) return 'excluded';
  return 'excluded';
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function makeInventoryKey(entityGstin: string, skuCode: string, articleCode: string, itemCode: string, uom: string): string | null {
  const identifier = skuCode || articleCode || itemCode;
  if (!identifier) return null;
  return [entityGstin || 'NO-GSTIN', identifier, uom].filter(Boolean).join('|').toUpperCase();
}

function normalizeRows(
  kind: ImportKind,
  file: Pick<ImportedInventoryFile, 'fileName' | 'sourceSheet' | 'headerRow' | 'rawRows' | 'headers' | 'batchId'>,
  mapping: ColumnMapping,
  context: ImportContext,
): NormalizedInventoryRecord[] {
  return file.rawRows.map((row, index) => {
    const quantity = numberValue(row, mapping, 'quantity');
    const taxableValue = numberValue(row, mapping, 'taxableValue');
    const mappedRate = numberValue(row, mapping, kind === 'sales' ? 'salesRate' : 'rate');
    const effectiveRate = mappedRate ?? (quantity && taxableValue != null ? taxableValue / quantity : null);
    const salesRate = kind === 'sales' ? effectiveRate : null;
    const rate = kind === 'sales' ? null : effectiveRate;
    const invoiceDate = dateValue(row, mapping);
    const skuCode = textValue(row, mapping, 'skuCode');
    const articleCode = textValue(row, mapping, 'articleCode');
    const itemCode = textValue(row, mapping, 'itemCode');
    const uom = normalizeUom(textValue(row, mapping, 'uom'));
    const entityGstin = textValue(row, mapping, 'entityGstin') || context.entity.primaryGstin || '';
    const invoiceNumber = textValue(row, mapping, 'invoiceNumber');
    const mappedLineNumber = textValue(row, mapping, 'lineNumber');
    const lineNumber = mappedLineNumber || String(index + 1);
    const status = textValue(row, mapping, 'status');
    const validationIssues: string[] = [];
    if (!invoiceDate) validationIssues.push('Missing or invalid invoice date');
    if (!skuCode && !articleCode && !itemCode) validationIssues.push('No reliable item identifier');
    if (quantity == null) validationIssues.push('Missing or invalid quantity');
    const inventoryKey = makeInventoryKey(entityGstin, skuCode, articleCode, itemCode, uom);
    const transactionKey = stableHash([
      kind, entityGstin || context.entity.id, invoiceNumber, invoiceDate,
      mappedLineNumber || (invoiceNumber ? '' : String(index + 1)),
      skuCode || articleCode || itemCode,
      normalizeReportingProduct(textValue(row, mapping, 'style')),
      normalizeReportingProduct(textValue(row, mapping, 'finalProductType')),
      quantity, taxableValue ?? effectiveRate,
    ].join('|').toLowerCase());
    const rawRow = Object.fromEntries(file.headers.map((header, column) => [header || `Column ${column + 1}`, row[column] ?? null]));

    return {
      transactionType: kind,
      entityId: context.entity.id,
      branchId: context.branch?.id ?? null,
      branchName: context.branch?.name ?? '',
      invoiceNumber,
      invoiceDate,
      status,
      statusCategory: statusCategory(status),
      entityCode: textValue(row, mapping, 'entityCode') || context.entity.code || '',
      entityName: textValue(row, mapping, 'entityName') || context.entity.name,
      entityGstin,
      vendorName: textValue(row, mapping, 'vendorName'),
      vendorGstin: textValue(row, mapping, 'vendorGstin'),
      itemCode,
      articleCode,
      skuCode,
      finalProductType: normalizeReportingProduct(textValue(row, mapping, 'finalProductType')),
      productCategory: textValue(row, mapping, 'productCategory'),
      style: textValue(row, mapping, 'style'),
      description: textValue(row, mapping, 'description'),
      uom,
      quantity,
      salesRate,
      purchasePrice: kind === 'sales' ? numberValue(row, mapping, 'purchasePrice') : null,
      rate,
      taxableValue,
      receivedQuantity: numberValue(row, mapping, 'receivedQuantity'),
      acceptedQuantity: numberValue(row, mapping, 'acceptedQuantity'),
      rejectedQuantity: numberValue(row, mapping, 'rejectedQuantity'),
      lineNumber,
      sourceFile: file.fileName,
      sourceSheet: file.sourceSheet,
      sourceRow: file.headerRow + index + 2,
      importBatchId: file.batchId,
      rawRow,
      inventoryKey,
      transactionKey,
      validationIssues,
    };
  });
}

function validationLabel(rows: NormalizedInventoryRecord[], mappingResolved: boolean): string {
  if (!mappingResolved) return 'Waiting for required mappings';
  const accepted = rows.filter((row) => row.validationIssues.length === 0).length;
  const needsMapping = rows.length - accepted;
  return needsMapping > 0 ? `${accepted} valid · ${needsMapping} need attention` : `${accepted} valid rows`;
}

export async function analyzeImportFile(kind: ImportKind, file: File, context: ImportContext): Promise<ImportedInventoryFile> {
  const sheets = await readSheets(file);
  let best: { sheet: string; rows: ImportRow[]; headerRow: number; score: number } | null = null;
  for (const { sheet, data } of sheets) {
    for (const [headerRow, row] of data.slice(0, 20).entries()) {
      const score = headerCandidateScore(kind, row);
      if (!best || score > best.score) best = { sheet, rows: data, headerRow, score };
    }
  }
  if (!best || best.rows.length === 0) throw new Error('No readable worksheet data was found.');

  const headers = best.rows[best.headerRow].map((cell, index) => String(cell ?? '').trim() || `Column ${index + 1}`);
  const templateSignature = signatureFor(kind, headers);
  const mapping = applySavedMapping(templateSignature, headers, autoMapHeaders(kind, headers));
  const batchId = window.crypto.randomUUID();
  const base = {
    id: window.crypto.randomUUID(),
    batchId,
    kind,
    fileName: file.name,
    fileSize: file.size,
    fileFingerprint: await fileFingerprint(file),
    sourceSheet: best.sheet,
    headerRow: best.headerRow,
    headers,
    rawRows: best.rows.slice(best.headerRow + 1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== '')),
  };
  const mappingResolved = hasRequiredMapping(mapping);
  const normalizedRows = mappingResolved ? normalizeRows(kind, base, mapping, context) : [];
  return {
    ...base,
    mapping,
    templateSignature,
    mappingStatus: mappingResolved ? 'Mapped' : 'Needs mapping',
    validationStatus: validationLabel(normalizedRows, mappingResolved),
    duplicateStatus: 'Unique',
    normalizedRows,
    issues: mappingResolved ? [] : ['Map Invoice Date, Quantity and at least one item identifier.'],
    normalizationVersion: CURRENT_NORMALIZATION_VERSION,
  };
}

export function migrateLegacyImportFile(
  kind: ImportKind,
  legacy: LegacyImportedFile,
  context: ImportContext,
): ImportedInventoryFile | null {
  let best: { headerRow: number; score: number } | null = null;
  for (const [headerRow, row] of legacy.rows.slice(0, 20).entries()) {
    const score = headerCandidateScore(kind, row);
    if (!best || score > best.score) best = { headerRow, score };
  }
  if (!best || legacy.rows.length === 0) return null;
  const headers = legacy.rows[best.headerRow].map((cell, index) => String(cell ?? '').trim() || `Column ${index + 1}`);
  const templateSignature = signatureFor(kind, headers);
  const mapping = applySavedMapping(templateSignature, headers, autoMapHeaders(kind, headers));
  const base = {
    id: legacy.id,
    batchId: window.crypto.randomUUID(),
    kind,
    fileName: legacy.fileName,
    fileSize: legacy.fileSize,
    fileFingerprint: `legacy-${stableHash(JSON.stringify(legacy.rows))}`,
    sourceSheet: 'Imported worksheet',
    headerRow: best.headerRow,
    headers,
    rawRows: legacy.rows.slice(best.headerRow + 1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== '')),
  };
  const mappingResolved = hasRequiredMapping(mapping);
  const normalizedRows = mappingResolved ? normalizeRows(kind, base, mapping, context) : [];
  return {
    ...base,
    mapping,
    templateSignature,
    mappingStatus: mappingResolved ? 'Mapped' : 'Needs mapping',
    validationStatus: validationLabel(normalizedRows, mappingResolved),
    duplicateStatus: 'Unique',
    normalizedRows,
    issues: mappingResolved ? [] : ['Map Invoice Date, Quantity and at least one item identifier.'],
    normalizationVersion: CURRENT_NORMALIZATION_VERSION,
  };
}

export function remapImportFile(
  file: ImportedInventoryFile,
  mapping: ColumnMapping,
  context: ImportContext,
): ImportedInventoryFile {
  const automaticMapping = autoMapHeaders(file.kind, file.headers);
  const upgradedMapping = { ...automaticMapping, ...mapping };
  for (const [field, automaticIndex] of Object.entries(automaticMapping)) {
    if (upgradedMapping[field] == null && automaticIndex != null) upgradedMapping[field] = automaticIndex;
  }
  if (!Object.hasOwn(mapping, 'productCategory')) {
    upgradedMapping.productCategory = automaticMapping.productCategory;
    if (upgradedMapping.itemCode === upgradedMapping.productCategory && automaticMapping.itemCode != null) {
      upgradedMapping.itemCode = automaticMapping.itemCode;
    }
  }
  if (!Object.hasOwn(mapping, 'finalProductType')) {
    upgradedMapping.finalProductType = automaticMapping.finalProductType;
    if (upgradedMapping.productCategory === upgradedMapping.finalProductType
      && automaticMapping.productCategory !== upgradedMapping.finalProductType) {
      upgradedMapping.productCategory = automaticMapping.productCategory;
    }
  }
  const normalizedHeaders = file.headers.map(normalizeHeader);
  const exactFinalProductTypeIndex = finalProductTypeHeaderIndex(normalizedHeaders);
  if (exactFinalProductTypeIndex >= 0) {
    upgradedMapping.finalProductType = exactFinalProductTypeIndex;
    if (upgradedMapping.productCategory === exactFinalProductTypeIndex
      && automaticMapping.productCategory !== exactFinalProductTypeIndex) {
      upgradedMapping.productCategory = automaticMapping.productCategory;
    }
  }
  if (file.kind === 'sales' && !Object.hasOwn(mapping, 'purchasePrice')) {
    upgradedMapping.purchasePrice = automaticMapping.purchasePrice;
    if (upgradedMapping.salesRate === upgradedMapping.purchasePrice && automaticMapping.salesRate !== upgradedMapping.purchasePrice) {
      upgradedMapping.salesRate = automaticMapping.salesRate;
    }
  }
  const mappedStatusHeader = upgradedMapping.status == null
    ? ''
    : normalizeHeader(file.headers[upgradedMapping.status] ?? '');
  if (mappedStatusHeader.includes('cost status')) upgradedMapping.status = automaticMapping.status;
  const mappingResolved = hasRequiredMapping(upgradedMapping);
  const normalizedRows = mappingResolved ? normalizeRows(file.kind, file, upgradedMapping, context) : [];
  return {
    ...file,
    mapping: upgradedMapping,
    mappingStatus: mappingResolved ? 'Mapped' : 'Needs mapping',
    validationStatus: validationLabel(normalizedRows, mappingResolved),
    normalizedRows,
    issues: mappingResolved ? [] : ['Map Invoice Date, Quantity and at least one item identifier.'],
    normalizationVersion: CURRENT_NORMALIZATION_VERSION,
  };
}

export function markFileDuplicates(files: ImportedInventoryFile[]): ImportedInventoryFile[] {
  const fingerprintCounts = new Map<string, number>();
  const lineCounts = new Map<string, number>();
  files.forEach((file) => {
    fingerprintCounts.set(file.fileFingerprint, (fingerprintCounts.get(file.fileFingerprint) ?? 0) + 1);
    file.normalizedRows.forEach((row) => lineCounts.set(row.transactionKey, (lineCounts.get(row.transactionKey) ?? 0) + 1));
  });
  return files.map((file) => {
    const exact = (fingerprintCounts.get(file.fileFingerprint) ?? 0) > 1;
    const duplicateLines = file.normalizedRows.filter((row) => (lineCounts.get(row.transactionKey) ?? 0) > 1).length;
    return {
      ...file,
      duplicateStatus: exact ? 'Exact duplicate file' : duplicateLines > 0 ? `${duplicateLines} duplicate rows` : 'Unique',
    };
  });
}

interface InventoryState {
  row: OpeningStockRow;
  quantity: number;
  value: number;
  averageCost: number;
  baselineDate: string | null;
  warnings: Set<string>;
}

export function calculateOpeningStock(
  filesByType: Partial<Record<ImportKind, ImportedInventoryFile[]>>,
  openingDate: string,
  includeDraft: boolean,
): OpeningStockResult {
  const salesFiles = filesByType.sales ?? [];
  const purchaseFiles = filesByType.purchases ?? [];
  const openingFiles = filesByType['opening-stock'] ?? [];
  const allFiles = [...salesFiles, ...purchaseFiles, ...openingFiles];
  const blockingIssues = allFiles
    .filter((file) => file.mappingStatus === 'Needs mapping')
    .map((file) => `${file.fileName} still needs mandatory column mapping.`);
  const summary: OpeningStockSummary = {
    salesFilesUploaded: salesFiles.length,
    purchaseFilesUploaded: purchaseFiles.length,
    salesRowsAccepted: 0,
    purchaseRowsAccepted: 0,
    excludedStatusRows: 0,
    duplicateRowsExcluded: 0,
    rowsNeedingMapping: 0,
    unknownSkuRows: 0,
    uomConflicts: 0,
    negativeStockItems: 0,
  };
  summary.rowsNeedingMapping = allFiles
    .filter((file) => file.mappingStatus === 'Needs mapping')
    .reduce((total, file) => total + file.rawRows.length, 0);
  if (!openingDate) blockingIssues.push('Choose an Opening Stock As On Date.');
  if (blockingIssues.length > 0) return { rows: [], summary, blockingIssues };

  const purchaseUoms = new Map<string, Set<string>>();
  purchaseFiles.flatMap((file) => file.normalizedRows).forEach((row) => {
    const id = row.skuCode || row.articleCode || row.itemCode;
    if (!id || !row.uom) return;
    const values = purchaseUoms.get(id) ?? new Set<string>();
    values.add(row.uom);
    purchaseUoms.set(id, values);
  });

  const seenLines = new Set<string>();
  const records = allFiles.flatMap((file) => file.normalizedRows).map((record) => ({ ...record }));
  records.forEach((row) => {
    if (!row.uom) {
      const id = row.skuCode || row.articleCode || row.itemCode;
      const known = id ? purchaseUoms.get(id) : undefined;
      if (known?.size === 1) row.uom = [...known][0];
      else if (known && known.size > 1) {
        row.validationIssues = [...row.validationIssues, 'UOM conflict'];
        summary.uomConflicts += 1;
      }
      row.inventoryKey = makeInventoryKey(row.entityGstin, row.skuCode, row.articleCode, row.itemCode, row.uom);
    }
  });

  const valid: NormalizedInventoryRecord[] = [];
  records.forEach((row) => {
    if (row.validationIssues.length > 0 || !row.inventoryKey || row.quantity == null || !row.invoiceDate) {
      summary.rowsNeedingMapping += 1;
      if (!row.skuCode && !row.articleCode && !row.itemCode) summary.unknownSkuRows += 1;
      return;
    }
    if (seenLines.has(row.transactionKey)) {
      summary.duplicateRowsExcluded += 1;
      return;
    }
    seenLines.add(row.transactionKey);
    if (row.statusCategory === 'excluded' || (row.statusCategory === 'draft' && !includeDraft)) {
      summary.excludedStatusRows += 1;
      return;
    }
    if (row.invoiceDate >= openingDate) return;
    if (row.transactionType === 'sales') summary.salesRowsAccepted += 1;
    if (row.transactionType === 'purchases') summary.purchaseRowsAccepted += 1;
    valid.push(row);
  });

  const states = new Map<string, InventoryState>();
  const baselines = valid.filter((row) => row.transactionType === 'opening-stock').sort((a, b) => (a.invoiceDate ?? '').localeCompare(b.invoiceDate ?? ''));
  baselines.forEach((record) => {
    if (!record.inventoryKey || record.quantity == null) return;
    const value = record.taxableValue ?? record.quantity * (record.rate ?? 0);
    states.set(record.inventoryKey, {
      quantity: record.quantity,
      value,
      averageCost: record.quantity !== 0 ? value / record.quantity : 0,
      baselineDate: record.invoiceDate,
      warnings: new Set(),
      row: {
        inventoryKey: record.inventoryKey,
        entity: record.entityName,
        gstin: record.entityGstin,
        skuCode: record.skuCode,
        articleCode: record.articleCode,
        itemCode: record.itemCode,
        description: record.description,
        uom: record.uom,
        openingQuantity: 0,
        averageCost: 0,
        openingValue: 0,
        purchaseQtyBeforeDate: 0,
        salesQtyBeforeDate: 0,
        sourceStatus: 'Calculated from uploaded transaction history',
        warningStatus: '',
      },
    });
  });

  const transactions = valid
    .filter((row) => row.transactionType !== 'opening-stock')
    .sort((a, b) => `${a.invoiceDate}|${a.sourceFile}|${a.sourceRow}`.localeCompare(`${b.invoiceDate}|${b.sourceFile}|${b.sourceRow}`));
  transactions.forEach((record) => {
    if (!record.inventoryKey || record.quantity == null) return;
    let state = states.get(record.inventoryKey);
    if (!state) {
      state = {
        quantity: 0,
        value: 0,
        averageCost: 0,
        baselineDate: null,
        warnings: new Set(),
        row: {
          inventoryKey: record.inventoryKey,
          entity: record.entityName,
          gstin: record.entityGstin,
          skuCode: record.skuCode,
          articleCode: record.articleCode,
          itemCode: record.itemCode,
          description: record.description,
          uom: record.uom,
          openingQuantity: 0,
          averageCost: 0,
          openingValue: 0,
          purchaseQtyBeforeDate: 0,
          salesQtyBeforeDate: 0,
          sourceStatus: 'Calculated from uploaded transaction history',
          warningStatus: '',
        },
      };
      states.set(record.inventoryKey, state);
    }
    if (state.baselineDate && record.invoiceDate! < state.baselineDate) return;
    if (record.transactionType === 'purchases') {
      const purchaseValue = record.taxableValue ?? record.quantity * (record.rate ?? 0);
      state.quantity += record.quantity;
      state.value += purchaseValue;
      state.averageCost = state.quantity !== 0 ? state.value / state.quantity : 0;
      state.row.purchaseQtyBeforeDate += record.quantity;
      if (record.taxableValue == null && record.rate == null) state.warnings.add('Purchase cost missing');
    } else {
      const cogs = record.quantity * state.averageCost;
      state.quantity -= record.quantity;
      state.value -= cogs;
      state.row.salesQtyBeforeDate += record.quantity;
      if (state.quantity < 0) state.warnings.add(`NEGATIVE STOCK / POSSIBLE MISSING HISTORY (${record.sourceFile}, row ${record.sourceRow})`);
      state.averageCost = state.quantity > 0 ? state.value / state.quantity : state.averageCost;
    }
  });

  const rows = [...states.values()].map((state) => {
    state.row.openingQuantity = state.quantity;
    state.row.openingValue = state.value;
    state.row.averageCost = state.averageCost;
    state.row.warningStatus = [...state.warnings].join('; ') || 'Valid';
    if (state.quantity < 0) summary.negativeStockItems += 1;
    return state.row;
  }).sort((a, b) => a.inventoryKey.localeCompare(b.inventoryKey));
  return { rows, summary, blockingIssues };
}

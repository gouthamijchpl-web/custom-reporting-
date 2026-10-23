import type { CostingPolicy, CostingPolicyRevision, InventoryCostingMethod } from '@/types';
import type { NormalizedInventoryRecord } from '@/features/uploads/inventoryImport';

export type GrossProfitCostStatus = 'COSTED' | 'ESTIMATED' | 'UNCOSTED';

export interface GrossProfitLine {
  transactionKey: string;
  invoiceDate: string;
  invoiceNumber: string;
  lineNumber: string;
  itemCode: string;
  skuCode: string;
  articleCode: string;
  description: string;
  productCategory: string;
  finalProductType: string;
  style: string;
  uom: string;
  quantity: number;
  salesValue: number;
  unitCost: number | null;
  cogsAmount: number | null;
  grossProfitAmount: number | null;
  grossProfitPercent: number | null;
  costingMethod: InventoryCostingMethod;
  costStatus: GrossProfitCostStatus;
  uncostedQuantity: number;
  sourceFile: string;
  sourceRow: number;
}

interface CostLot {
  quantity: number;
  unitCost: number | null;
  estimated: boolean;
}

type CostAllocation = CostLot;

interface InventoryState {
  lots: CostLot[];
  deficitQuantity: number;
  saleHistory: CostAllocation[][];
  method: InventoryCostingMethod;
  lastKnownUnitCost: number | null;
}

const DEFAULT_POLICY: CostingPolicy = {
  entityId: '',
  currentMethod: 'MOVING_WEIGHTED_AVERAGE',
  revisions: [{ id: null, method: 'MOVING_WEIGHTED_AVERAGE', effectiveFrom: null, createdAt: null }],
};

function finite(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

export function transactionValue(row: NormalizedInventoryRecord): number {
  if (finite(row.taxableValue)) return row.taxableValue;
  const rate = row.transactionType === 'sales' ? row.salesRate : row.rate;
  return finite(row.quantity) && finite(rate) ? row.quantity * rate : 0;
}

function unitPurchaseCost(row: NormalizedInventoryRecord): number | null {
  if (!finite(row.quantity) || row.quantity === 0) return null;
  if (finite(row.taxableValue)) return Math.abs(row.taxableValue / row.quantity);
  if (finite(row.rate)) return Math.abs(row.rate);
  return null;
}

function itemKey(row: NormalizedInventoryRecord): string | null {
  const identifier = row.skuCode || row.articleCode || row.itemCode;
  return identifier ? `${row.entityId}|${row.branchId ?? ''}|${identifier.trim().toLocaleUpperCase()}|${row.uom}` : null;
}

function revisionsFor(policy?: CostingPolicy): CostingPolicyRevision[] {
  const revisions = policy?.revisions?.length ? policy.revisions : DEFAULT_POLICY.revisions;
  return [...revisions].sort((left, right) => {
    if (left.effectiveFrom == null) return right.effectiveFrom == null ? 0 : -1;
    if (right.effectiveFrom == null) return 1;
    return left.effectiveFrom.localeCompare(right.effectiveFrom);
  });
}

function methodAt(revisions: readonly CostingPolicyRevision[], date: string): InventoryCostingMethod {
  let method: InventoryCostingMethod = 'MOVING_WEIGHTED_AVERAGE';
  for (const revision of revisions) {
    if (revision.effectiveFrom != null && revision.effectiveFrom > date) break;
    method = revision.method;
  }
  return method;
}

function totalQuantity(state: InventoryState): number {
  return state.lots.reduce((total, lot) => total + lot.quantity, 0);
}

function collapseToWeightedAverage(state: InventoryState): void {
  const quantity = totalQuantity(state);
  if (quantity <= 0) {
    state.lots = [];
    return;
  }
  const hasUnknownCost = state.lots.some((lot) => lot.unitCost == null);
  const hasEstimatedCost = state.lots.some((lot) => lot.estimated);
  const value = state.lots.reduce((total, lot) => total + lot.quantity * (lot.unitCost ?? 0), 0);
  state.lots = [{ quantity, unitCost: hasUnknownCost ? null : value / quantity, estimated: hasEstimatedCost }];
}

function setMethod(state: InventoryState, method: InventoryCostingMethod): void {
  if (state.method === method) return;
  if (method === 'MOVING_WEIGHTED_AVERAGE') collapseToWeightedAverage(state);
  state.method = method;
}

function addInventory(state: InventoryState, quantity: number, unitCost: number | null, estimated = false): number {
  let remaining = quantity;
  if (state.deficitQuantity > 0) {
    const covered = Math.min(state.deficitQuantity, remaining);
    state.deficitQuantity -= covered;
    remaining -= covered;
  }
  if (remaining <= 0) return 0;
  if (state.method === 'MOVING_WEIGHTED_AVERAGE') {
    const currentQuantity = totalQuantity(state);
    const currentHasUnknownCost = state.lots.some((lot) => lot.unitCost == null);
    const currentHasEstimatedCost = state.lots.some((lot) => lot.estimated);
    const currentValue = state.lots.reduce((total, lot) => total + lot.quantity * (lot.unitCost ?? 0), 0);
    state.lots = [{
      quantity: currentQuantity + remaining,
      unitCost: currentHasUnknownCost || unitCost == null
        ? null
        : (currentValue + remaining * unitCost) / (currentQuantity + remaining),
      estimated: currentHasEstimatedCost || estimated,
    }];
  } else {
    state.lots.push({ quantity: remaining, unitCost, estimated });
  }
  return remaining;
}

function removeInventory(state: InventoryState, quantity: number, newestFirst: boolean): CostAllocation[] {
  let remaining = quantity;
  const allocations: CostAllocation[] = [];
  while (remaining > 0 && state.lots.length > 0) {
    const index = newestFirst ? state.lots.length - 1 : 0;
    const lot = state.lots[index];
    const taken = Math.min(lot.quantity, remaining);
    allocations.push({ quantity: taken, unitCost: lot.unitCost, estimated: lot.estimated });
    lot.quantity -= taken;
    remaining -= taken;
    if (lot.quantity <= 0.0000001) state.lots.splice(index, 1);
  }
  if (remaining > 0.0000001) {
    state.deficitQuantity += remaining;
    allocations.push({ quantity: remaining, unitCost: null, estimated: false });
  }
  return allocations;
}

function estimateMissingAllocations(allocations: CostAllocation[], fallbackCost: number | null): CostAllocation[] {
  if (fallbackCost == null) return allocations;
  return allocations.map((allocation) => allocation.unitCost == null
    ? { ...allocation, unitCost: fallbackCost, estimated: true }
    : allocation);
}

function restoreSaleReturn(state: InventoryState, returnQuantity: number, fallbackCost: number | null): CostAllocation[] {
  let remaining = returnQuantity;
  const restored: CostAllocation[] = [];
  while (remaining > 0.0000001 && state.saleHistory.length > 0) {
    const previousSale = state.saleHistory[state.saleHistory.length - 1];
    while (remaining > 0.0000001 && previousSale.length > 0) {
      const allocation = previousSale[previousSale.length - 1];
      const restoredQuantity = Math.min(allocation.quantity, remaining);
      restored.push({ quantity: restoredQuantity, unitCost: allocation.unitCost, estimated: allocation.estimated });
      allocation.quantity -= restoredQuantity;
      remaining -= restoredQuantity;
      if (allocation.quantity <= 0.0000001) previousSale.pop();
    }
    if (previousSale.length === 0) state.saleHistory.pop();
  }
  if (remaining > 0.0000001) {
    // Without the original sale, use the cost of stock available on the return date.
    // Keep the result uncosted when that stock has no reliable purchase cost.
    const currentLot = state.method === 'FIFO' ? state.lots.at(-1) : state.lots[0];
    const unitCost = state.deficitQuantity > 0 ? null : currentLot?.unitCost ?? null;
    restored.push({ quantity: remaining, unitCost, estimated: unitCost != null });
  }
  const allocations = estimateMissingAllocations(restored, fallbackCost);
  for (const allocation of allocations) addInventory(state, allocation.quantity, allocation.unitCost, allocation.estimated);
  return allocations;
}

function allocationValue(allocations: readonly CostAllocation[]): number | null {
  if (allocations.some((allocation) => allocation.unitCost == null)) return null;
  return allocations.reduce((total, allocation) => total + allocation.quantity * (allocation.unitCost ?? 0), 0);
}

function validRows(rows: readonly NormalizedInventoryRecord[]): NormalizedInventoryRecord[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (row.statusCategory !== 'finalized' || row.validationIssues.length > 0 || !row.invoiceDate
      || !finite(row.quantity) || !itemKey(row) || seen.has(row.transactionKey)) return false;
    seen.add(row.transactionKey);
    return true;
  });
}

/**
 * Canonical invoice-line GP calculation used by both the Data Upload GP tab and reports.
 * By default, cost comes only from opening stock and purchase history. The Data Upload
 * GP view can explicitly opt into provisional estimates when that history is incomplete.
 */
export function calculateGrossProfitLines(
  sales: readonly NormalizedInventoryRecord[],
  purchases: readonly NormalizedInventoryRecord[],
  openingStock: readonly NormalizedInventoryRecord[],
  policy?: CostingPolicy,
  options: { estimateMissingCost?: boolean } = {},
): GrossProfitLine[] {
  const revisions = revisionsFor(policy);
  const events = validRows([...openingStock, ...purchases, ...sales]).sort((left, right) => {
    const typeOrder = (row: NormalizedInventoryRecord) => row.transactionType === 'opening-stock' ? 0 : row.transactionType === 'purchases' ? 1 : 2;
    return `${left.invoiceDate}|${typeOrder(left)}|${left.sourceFile}|${String(left.sourceRow).padStart(10, '0')}`
      .localeCompare(`${right.invoiceDate}|${typeOrder(right)}|${right.sourceFile}|${String(right.sourceRow).padStart(10, '0')}`);
  });
  const states = new Map<string, InventoryState>();
  const results: GrossProfitLine[] = [];

  for (const row of events) {
    const key = itemKey(row);
    if (!key || !row.invoiceDate || row.quantity == null) continue;
    const method = methodAt(revisions, row.invoiceDate);
    const state = states.get(key) ?? { lots: [], deficitQuantity: 0, saleHistory: [], method, lastKnownUnitCost: null };
    setMethod(state, method);
    states.set(key, state);

    if (row.transactionType === 'opening-stock' || row.transactionType === 'purchases') {
      const cost = unitPurchaseCost(row);
      if (row.quantity > 0) {
        addInventory(state, row.quantity, cost);
        if (cost != null && cost > 0) state.lastKnownUnitCost = cost;
      }
      else if (row.quantity < 0) removeInventory(state, Math.abs(row.quantity), true);
      continue;
    }

    const quantity = row.quantity;
    const salesValue = transactionValue(row);
    const salesPurchasePrice = finite(row.purchasePrice) && row.purchasePrice !== 0 ? Math.abs(row.purchasePrice) : null;
    const fallbackCost = options.estimateMissingCost ? state.lastKnownUnitCost ?? salesPurchasePrice : null;
    let allocations: CostAllocation[];
    if (quantity >= 0) {
      allocations = estimateMissingAllocations(removeInventory(state, quantity, false), fallbackCost);
      state.saleHistory.push(allocations.map((allocation) => ({ ...allocation })));
    } else {
      allocations = restoreSaleReturn(state, Math.abs(quantity), fallbackCost);
    }
    const allocatedValue = allocationValue(allocations);
    const cogsAmount = allocatedValue == null ? null : allocatedValue * (quantity < 0 ? -1 : 1);
    const grossProfitAmount = cogsAmount == null ? null : salesValue - cogsAmount;
    const grossProfitPercent = grossProfitAmount == null || salesValue === 0
      ? null
      : (grossProfitAmount / salesValue) * 100;
    results.push({
      transactionKey: row.transactionKey,
      invoiceDate: row.invoiceDate,
      invoiceNumber: row.invoiceNumber,
      lineNumber: row.lineNumber,
      itemCode: row.itemCode,
      skuCode: row.skuCode,
      articleCode: row.articleCode,
      description: row.description,
      productCategory: row.productCategory,
      finalProductType: row.finalProductType,
      style: row.style,
      uom: row.uom,
      quantity,
      salesValue,
      unitCost: cogsAmount == null || quantity === 0 ? null : Math.abs(cogsAmount / quantity),
      cogsAmount,
      grossProfitAmount,
      grossProfitPercent,
      costingMethod: method,
      costStatus: cogsAmount == null ? 'UNCOSTED' : allocations.some((allocation) => allocation.estimated) ? 'ESTIMATED' : 'COSTED',
      uncostedQuantity: allocations.reduce((total, allocation) => total + (allocation.unitCost == null ? allocation.quantity : 0), 0),
      sourceFile: row.sourceFile,
      sourceRow: row.sourceRow,
    });
  }
  return results.sort((left, right) => `${right.invoiceDate}|${right.invoiceNumber}|${right.lineNumber}`
    .localeCompare(`${left.invoiceDate}|${left.invoiceNumber}|${left.lineNumber}`));
}

export function grossProfitByTransaction(lines: readonly GrossProfitLine[]): ReadonlyMap<string, GrossProfitLine> {
  return new Map(lines.map((line) => [line.transactionKey, line]));
}

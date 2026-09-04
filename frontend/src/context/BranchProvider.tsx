import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, entityApi } from '@/api';
import { useEntities } from '@/hooks/useEntities';
import { BranchContext, type BranchContextValue, type BranchStatus } from './branchContext';
import type { EntityBranch } from '@/types';

const BRANCH_SELECTION_KEY = 'custom-reporting.selected-branches';

interface LoadedBranches {
  entityId: string;
  branches: EntityBranch[];
}

interface BranchFailure {
  entityId: string;
  message: string;
}

function readRememberedSelections(): Record<string, string> {
  try {
    const stored = window.localStorage.getItem(BRANCH_SELECTION_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const { selectedEntity } = useEntities();
  const entityId = selectedEntity?.id ?? null;
  const [loaded, setLoaded] = useState<LoadedBranches | null>(null);
  const [failure, setFailure] = useState<BranchFailure | null>(null);
  const [selectedByEntity, setSelectedByEntity] = useState<Record<string, string>>(readRememberedSelections);

  useEffect(() => {
    try {
      window.localStorage.setItem(BRANCH_SELECTION_KEY, JSON.stringify(selectedByEntity));
    } catch {
      // Selection persistence is a convenience; branch loading and selection still work without it.
    }
  }, [selectedByEntity]);

  const applyBranches = useCallback((ownerEntityId: string, branches: EntityBranch[]) => {
    setLoaded({ entityId: ownerEntityId, branches });
    setFailure(null);
    setSelectedByEntity((current) => {
      const activeBranches = branches.filter((branch) => branch.active);
      const remembered = activeBranches.find((branch) => branch.id === current[ownerEntityId]);
      const fallback = activeBranches.find((branch) => branch.primaryBranch) ?? activeBranches[0];
      const nextId = remembered?.id ?? fallback?.id;
      if (!nextId || current[ownerEntityId] === nextId) return current;
      return { ...current, [ownerEntityId]: nextId };
    });
  }, []);

  const reload = useCallback((): Promise<void> => {
    if (!entityId) return Promise.resolve();
    return entityApi
      .listBranches(entityId)
      .then((branches) => applyBranches(entityId, branches))
      .catch((error: unknown) => {
        setFailure({
          entityId,
          message: error instanceof ApiError ? error.message : 'Unable to load branches.',
        });
      });
  }, [applyBranches, entityId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const select = useCallback((branchId: string) => {
    if (!entityId) return;
    setSelectedByEntity((current) => ({ ...current, [entityId]: branchId }));
  }, [entityId]);

  const value = useMemo<BranchContextValue>(() => {
    const isCurrent = loaded?.entityId === entityId;
    const errorMessage = failure?.entityId === entityId ? failure.message : null;
    const status: BranchStatus = entityId === null || (!isCurrent && !errorMessage)
      ? 'loading'
      : errorMessage
        ? 'error'
        : 'ready';
    const branches = isCurrent ? loaded.branches : [];
    const selectableBranches = branches.filter((branch) => branch.active);
    const selectedBranchId = entityId ? selectedByEntity[entityId] : undefined;

    return {
      status,
      branches,
      selectableBranches,
      selectedBranch: selectableBranches.find((branch) => branch.id === selectedBranchId) ?? null,
      errorMessage,
      reload,
      select,
    };
  }, [entityId, failure, loaded, reload, select, selectedByEntity]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

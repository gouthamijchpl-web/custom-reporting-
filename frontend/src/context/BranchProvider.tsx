import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, entityApi } from '@/api';
import { useCloudPreference } from '@/hooks/useCloudPreference';
import { useEntities } from '@/hooks/useEntities';
import { BranchContext, type BranchContextValue, type BranchStatus } from './branchContext';
import type { EntityBranch } from '@/types';

interface LoadedBranches {
  entityId: string;
  branches: EntityBranch[];
}

interface BranchFailure {
  entityId: string;
  message: string;
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const { selectedEntity } = useEntities();
  const entityId = selectedEntity?.id ?? null;
  const [loaded, setLoaded] = useState<LoadedBranches | null>(null);
  const [failure, setFailure] = useState<BranchFailure | null>(null);
  const [selectedByEntity, setSelectedByEntity] = useCloudPreference<Record<string, string>>(
    'navigation.selected-branches', {},
  );

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
  }, [setSelectedByEntity]);

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
  }, [entityId, setSelectedByEntity]);

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

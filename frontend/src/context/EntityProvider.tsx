import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, entityApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { EntityContext, type EntityContextValue, type EntityStatus } from './entityContext';
import type {
  CreateEntityRequest,
  EntityListResponse,
  ReportingEntity,
  UpdateEntityRequest,
} from '@/types';

/** Loaded data tagged with the account it belongs to. */
interface LoadedEntities {
  ownerId: string;
  entities: ReportingEntity[];
  selectedEntityId: string | null;
}

interface LoadFailure {
  ownerId: string;
  message: string;
}

/**
 * Owns the account's entities and which one is active.
 *
 * The list is fetched once a session exists and kept in one place, so the switcher in the
 * header — and every module that will later report against the active entity — read the
 * same state instead of each fetching their own copy.
 *
 * Both the loaded list and any load failure are tagged with the account they belong to,
 * and everything exposed is derived from that tag. That way signing out clears the list
 * without a synchronising effect, and one user can never briefly see the previous user's
 * entities while a fresh load is still in flight.
 *
 * Mutations re-read the server's view rather than patching local state optimistically, so
 * the client cannot drift from what was actually stored.
 */
export function EntityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loaded, setLoaded] = useState<LoadedEntities | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  const applyList = useCallback((ownerId: string, list: EntityListResponse) => {
    setLoaded({ ownerId, entities: list.entities, selectedEntityId: list.selectedEntityId });
    setFailure(null);
  }, []);

  /**
   * Written as an explicit promise chain rather than an `async` function so that no state
   * update can run synchronously when the effect below invokes it.
   */
  const reload = useCallback((): Promise<void> => {
    if (!userId) {
      return Promise.resolve();
    }
    return entityApi
      .list()
      .then((list) => applyList(userId, list))
      .catch((error: unknown) => {
        setFailure({
          ownerId: userId,
          message: error instanceof ApiError ? error.message : 'Unable to load your entities.',
        });
      });
  }, [applyList, userId]);

  // Load once a session exists, and again whenever a different account signs in.
  useEffect(() => {
    void reload();
  }, [reload]);

  const select = useCallback(
    async (entityId: string) => {
      const list = await entityApi.select(entityId);
      if (userId) {
        applyList(userId, list);
      }
    },
    [applyList, userId],
  );

  const create = useCallback(
    async (request: CreateEntityRequest) => {
      const created = await entityApi.create(request);
      // The server decides whether this became the active entity, so re-read the list.
      await reload();
      return created;
    },
    [reload],
  );

  const update = useCallback(
    async (entityId: string, request: UpdateEntityRequest) => {
      const updated = await entityApi.update(entityId, request);
      await reload();
      return updated;
    },
    [reload],
  );

  const remove = useCallback(
    async (entityId: string) => {
      await entityApi.remove(entityId);
      await reload();
    },
    [reload],
  );

  const value = useMemo<EntityContextValue>(() => {
    const isCurrent = loaded !== null && loaded.ownerId === userId;
    const errorMessage = failure !== null && failure.ownerId === userId ? failure.message : null;

    const status: EntityStatus =
      userId === null ? 'loading' : errorMessage !== null ? 'error' : isCurrent ? 'ready' : 'loading';

    const entities = isCurrent ? loaded.entities : [];
    const selectedEntityId = isCurrent ? loaded.selectedEntityId : null;

    return {
      status,
      entities,
      selectableEntities: entities.filter((entity) => entity.active),
      selectedEntity: entities.find((entity) => entity.id === selectedEntityId) ?? null,
      errorMessage,
      reload,
      select,
      create,
      update,
      remove,
    };
  }, [loaded, failure, userId, reload, select, create, update, remove]);

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>;
}

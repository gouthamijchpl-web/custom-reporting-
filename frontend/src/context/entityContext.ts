import { createContext } from 'react';
import type { CreateEntityRequest, ReportingEntity, UpdateEntityRequest } from '@/types';

export type EntityStatus = 'loading' | 'ready' | 'error';

export interface EntityContextValue {
  status: EntityStatus;
  entities: ReportingEntity[];
  /** Entities that can currently be worked on; inactive ones are excluded. */
  selectableEntities: ReportingEntity[];
  selectedEntity: ReportingEntity | null;
  /** Message from the last failed load, for the switcher to surface. */
  errorMessage: string | null;
  reload: () => Promise<void>;
  select: (entityId: string) => Promise<void>;
  create: (request: CreateEntityRequest) => Promise<ReportingEntity>;
  update: (entityId: string, request: UpdateEntityRequest) => Promise<ReportingEntity>;
  remove: (entityId: string) => Promise<void>;
}

export const EntityContext = createContext<EntityContextValue | undefined>(undefined);

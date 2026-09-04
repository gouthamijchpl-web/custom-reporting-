import { httpClient } from './httpClient';
import type {
  CreateEntityRequest,
  EntityListResponse,
  ReportingEntity,
  UpdateEntityRequest,
  EntityBranch,
  BranchRequest,
  EntityGstin,
  GstinRequest,
  EntityBook,
  BookRequest,
} from '@/types';

/** Entity endpoints for the signed-in account. */
export const entityApi = {
  list: () => httpClient.get<EntityListResponse>('/entities'),

  get: (entityId: string) => httpClient.get<ReportingEntity>(`/entities/${entityId}`),

  create: (request: CreateEntityRequest) => httpClient.post<ReportingEntity>('/entities', request),

  update: (entityId: string, request: UpdateEntityRequest) =>
    httpClient.put<ReportingEntity>(`/entities/${entityId}`, request),

  remove: (entityId: string) => httpClient.delete<void>(`/entities/${entityId}`),

  setStatus: (entityId: string, active: boolean) =>
    httpClient.patch<ReportingEntity>(`/entities/${entityId}/status`, { active }),

  listBranches: (entityId: string) => httpClient.get<EntityBranch[]>(`/entities/${entityId}/branches`),
  createBranch: (entityId: string, request: BranchRequest) =>
    httpClient.post<EntityBranch>(`/entities/${entityId}/branches`, request),
  updateBranch: (entityId: string, id: string, request: BranchRequest) =>
    httpClient.put<EntityBranch>(`/entities/${entityId}/branches/${id}`, request),
  setBranchStatus: (entityId: string, id: string, active: boolean) =>
    httpClient.patch<EntityBranch>(`/entities/${entityId}/branches/${id}/status`, { active }),
  archiveBranch: (entityId: string, id: string) =>
    httpClient.delete<void>(`/entities/${entityId}/branches/${id}`),

  listGstins: (entityId: string) => httpClient.get<EntityGstin[]>(`/entities/${entityId}/gstins`),
  createGstin: (entityId: string, request: GstinRequest) =>
    httpClient.post<EntityGstin>(`/entities/${entityId}/gstins`, request),
  updateGstin: (entityId: string, id: string, request: GstinRequest) =>
    httpClient.put<EntityGstin>(`/entities/${entityId}/gstins/${id}`, request),
  setGstinStatus: (entityId: string, id: string, active: boolean) =>
    httpClient.patch<EntityGstin>(`/entities/${entityId}/gstins/${id}/status`, { active }),
  archiveGstin: (entityId: string, id: string) =>
    httpClient.delete<void>(`/entities/${entityId}/gstins/${id}`),

  listBooks: (entityId: string) => httpClient.get<EntityBook[]>(`/entities/${entityId}/books`),
  createBook: (entityId: string, request: BookRequest) =>
    httpClient.post<EntityBook>(`/entities/${entityId}/books`, request),
  updateBook: (entityId: string, id: string, request: BookRequest) =>
    httpClient.put<EntityBook>(`/entities/${entityId}/books/${id}`, request),
  setBookStatus: (entityId: string, id: string, active: boolean) =>
    httpClient.patch<EntityBook>(`/entities/${entityId}/books/${id}/status`, { active }),
  archiveBook: (entityId: string, id: string) =>
    httpClient.delete<void>(`/entities/${entityId}/books/${id}`),

  /** Makes an entity active; returns the refreshed list and selection. */
  select: (entityId: string) => httpClient.put<EntityListResponse>('/entities/selection', { entityId }),
};

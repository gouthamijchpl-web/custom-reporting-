import { httpClient } from './httpClient';

export interface UploadStateResponse<TUploads> {
  entityId: string;
  branchId: string | null;
  uploadsByType: TUploads;
  updatedAt?: string;
}

function query(entityId: string, branchId: string | null): string {
  const parameters = new URLSearchParams({ entityId });
  if (branchId) parameters.set('branchId', branchId);
  return parameters.toString();
}

export const uploadApi = {
  load: <TUploads>(entityId: string, branchId: string | null) =>
    httpClient.get<UploadStateResponse<TUploads>>(`/uploads/state?${query(entityId, branchId)}`),

  save: <TUploads>(entityId: string, branchId: string | null, uploadsByType: TUploads) =>
    httpClient.put<UploadStateResponse<TUploads>>('/uploads/state', { entityId, branchId, uploadsByType }),

  clear: (entityId: string, branchId: string | null) =>
    httpClient.delete<void>(`/uploads/state?${query(entityId, branchId)}`),
};

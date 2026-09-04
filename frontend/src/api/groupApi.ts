import { httpClient } from './httpClient';
import type { BusinessGroup, CreateGroupRequest } from '@/types';

export const groupApi = {
  list: () => httpClient.get<BusinessGroup[]>('/groups'),
  create: (request: CreateGroupRequest) => httpClient.post<BusinessGroup>('/groups', request),
  update: (groupId: string, request: CreateGroupRequest) => httpClient.put<BusinessGroup>(`/groups/${groupId}`, request),
  remove: (groupId: string) => httpClient.delete<void>(`/groups/${groupId}`),
};

import { httpClient } from './httpClient';
import type {
  AccessStatus,
  CreateTeamMemberRequest,
  MessageResponse,
  TeamFilters,
  TeamMember,
  UpdateTeamMemberRequest,
} from '@/types';

/** Builds the query string, omitting filters that are not set. */
function toQuery(filters: Partial<TeamFilters>): string {
  const params = new URLSearchParams();
  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.role) {
    params.set('role', filters.role);
  }
  if (filters.status) {
    params.set('status', filters.status);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Team endpoints. Every one requires the Admin role; the backend rejects anyone else
 * regardless of what the interface chooses to show.
 */
export const teamApi = {
  list: (filters: Partial<TeamFilters> = {}) =>
    httpClient.get<TeamMember[]>(`/team/users${toQuery(filters)}`),

  get: (memberId: string) => httpClient.get<TeamMember>(`/team/users/${memberId}`),

  create: (request: CreateTeamMemberRequest) => httpClient.post<TeamMember>('/team/users', request),

  update: (memberId: string, request: UpdateTeamMemberRequest) =>
    httpClient.put<TeamMember>(`/team/users/${memberId}`, request),

  changeStatus: (memberId: string, accessStatus: AccessStatus) =>
    httpClient.patch<TeamMember>(`/team/users/${memberId}/status`, { accessStatus }),

  remove: (memberId: string) => httpClient.delete<MessageResponse>(`/team/users/${memberId}`),
};

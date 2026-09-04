import { httpClient } from './httpClient';
import type { AuthenticatedUser, ChangePasswordRequest, MessageResponse, UpdateAccountRequest, WorkspaceConfiguration, WorkspaceConfigurationRequest } from '@/types';

/** Account and security endpoints for the signed-in user. */
export const settingsApi = {
  getAccount: () => httpClient.get<AuthenticatedUser>('/settings/account'),

  updateAccount: (request: UpdateAccountRequest) =>
    httpClient.put<AuthenticatedUser>('/settings/account', request),

  changePassword: (request: ChangePasswordRequest) =>
    httpClient.put<MessageResponse>('/settings/password', request),

  getWorkspace: () => httpClient.get<WorkspaceConfiguration>('/settings/workspace'),
  updateWorkspace: (request: WorkspaceConfigurationRequest) =>
    httpClient.put<WorkspaceConfiguration>('/settings/workspace', request),
};

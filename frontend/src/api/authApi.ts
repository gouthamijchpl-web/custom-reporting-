import { httpClient } from './httpClient';
import type {
  AuthenticationResponse,
  AuthenticatedUser,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  SignupRequest,
} from '@/types';

/**
 * Authentication endpoints. Keeping every URL in one module means a backend route change
 * touches exactly one file.
 */
export const authApi = {
  signup: (request: SignupRequest) =>
    httpClient.post<AuthenticatedUser>('/auth/signup', request, { authenticated: false }),

  login: (request: LoginRequest) =>
    httpClient.post<AuthenticationResponse>('/auth/login', request, { authenticated: false }),

  /** Exchanges the httpOnly refresh cookie for a new access token. */
  refresh: () => httpClient.post<AuthenticationResponse>('/auth/refresh', undefined, { authenticated: false }),

  logout: () => httpClient.post<MessageResponse>('/auth/logout', undefined, { authenticated: false }),

  currentUser: () => httpClient.get<AuthenticatedUser>('/auth/me'),

  forgotPassword: (request: ForgotPasswordRequest) =>
    httpClient.post<MessageResponse>('/auth/forgot-password', request, { authenticated: false }),
};

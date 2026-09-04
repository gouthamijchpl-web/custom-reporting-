/** Authentication payloads exchanged with /api/v1/auth. */

import type { AccessStatus, Role } from './team';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  /** Whether this account is currently permitted to use the application. */
  accessStatus: AccessStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Sign-in result. The refresh token is not part of this payload: it travels in an
 * httpOnly cookie the browser manages and scripts cannot read.
 */
export interface AuthenticationResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthenticatedUser;
}

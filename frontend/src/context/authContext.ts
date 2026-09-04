import { createContext } from 'react';
import type { AuthenticatedUser, LoginRequest, SignupRequest } from '@/types';

/**
 * Lifecycle of the session, kept explicit so routes can tell "still checking" apart from
 * "definitely signed out" and avoid flashing the login screen on every page load.
 */
export type AuthStatus = 'initialising' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  login: (request: LoginRequest) => Promise<void>;
  signup: (request: SignupRequest) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  /** Refreshes the cached user after the profile is edited in Settings. */
  setUser: (user: AuthenticatedUser) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

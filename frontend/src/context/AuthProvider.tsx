import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi, tokenStore } from '@/api';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';
import type { AuthenticatedUser, AuthenticationResponse, LoginRequest, SignupRequest } from '@/types';

/** Renew the access token this many seconds before it expires. */
const REFRESH_MARGIN_SECONDS = 60;

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Owns the session for the whole application.
 *
 * On start-up it tries to exchange the httpOnly refresh cookie for an access token, which
 * is what keeps a user signed in across reloads without ever putting a token in storage a
 * script could read. While the token is alive a timer renews it shortly before expiry, so
 * an active user is never interrupted; if renewal fails the session is cleared and the
 * protected routes send the user back to the login screen.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('initialising');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Lets the renewal timer re-enter `startSession` to schedule the next renewal, without
   * the callback having to close over itself.
   */
  const startSessionRef = useRef<(session: AuthenticationResponse) => void>(() => {});

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const endSession = useCallback(() => {
    clearRefreshTimer();
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, [clearRefreshTimer]);

  const startSession = useCallback(
    (session: AuthenticationResponse) => {
      tokenStore.set(session.accessToken);
      setUser(session.user);
      setStatus('authenticated');

      clearRefreshTimer();
      const delaySeconds = Math.max(session.expiresInSeconds - REFRESH_MARGIN_SECONDS, 30);
      refreshTimerRef.current = setTimeout(() => {
        authApi
          .refresh()
          .then((renewed) => startSessionRef.current(renewed))
          .catch(() => endSession());
      }, delaySeconds * 1000);
    },
    [clearRefreshTimer, endSession],
  );

  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  // Restore the session on first load, and again whenever the app is remounted.
  useEffect(() => {
    let isActive = true;

    authApi
      .refresh()
      .then((session) => {
        if (isActive) {
          startSession(session);
        }
      })
      .catch(() => {
        if (isActive) {
          // No usable cookie: a first visit or an expired session. Both mean signed out.
          setStatus('unauthenticated');
        }
      });

    return () => {
      isActive = false;
    };
  }, [startSession]);

  // The HTTP client reports sessions it could not renew mid-request.
  useEffect(() => tokenStore.onSessionExpired(endSession), [endSession]);

  useEffect(() => clearRefreshTimer, [clearRefreshTimer]);

  const login = useCallback(
    async (request: LoginRequest) => {
      const session = await authApi.login(request);
      startSession(session);
    },
    [startSession],
  );

  const signup = useCallback(async (request: SignupRequest) => authApi.signup(request), []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Sign-out must succeed locally even if the server call fails.
      endSession();
    }
  }, [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      login,
      signup,
      logout,
      setUser,
    }),
    [status, user, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

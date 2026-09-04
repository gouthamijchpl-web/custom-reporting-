/**
 * In-memory holder for the access token.
 *
 * The token is deliberately never written to localStorage or sessionStorage: anything
 * stored there is readable by any script on the page. Session continuity across reloads
 * comes from the httpOnly refresh cookie instead, which is exchanged for a fresh access
 * token when the application starts.
 */

type SessionExpiredListener = () => void;

let accessToken: string | null = null;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string): void {
    accessToken = token;
  },

  clear(): void {
    accessToken = null;
  },

  /**
   * Registers a callback invoked when the session can no longer be renewed, letting the
   * authentication context reset its state and route back to the login screen.
   *
   * @returns an unsubscribe function
   */
  onSessionExpired(listener: SessionExpiredListener): () => void {
    sessionExpiredListeners.add(listener);
    return () => sessionExpiredListeners.delete(listener);
  },

  notifySessionExpired(): void {
    accessToken = null;
    sessionExpiredListeners.forEach((listener) => listener());
  },
};

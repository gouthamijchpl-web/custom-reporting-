import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/context/authContext';

/**
 * Access to the current session.
 *
 * @throws if used outside the provider, which turns a silent null-session bug into an
 *         immediate, obvious failure during development
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}

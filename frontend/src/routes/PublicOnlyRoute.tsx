import { Navigate, Outlet } from 'react-router-dom';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks';
import { DEFAULT_AUTHENTICATED_ROUTE } from './paths';

/**
 * Keeps signed-in users off the authentication screens, sending them straight to the
 * workspace instead of showing a login form they no longer need.
 */
export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === 'initialising') {
    return <LoadingState fillHeight message="Checking your session…" />;
  }

  if (status === 'authenticated') {
    return <Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />;
  }

  return <Outlet />;
}

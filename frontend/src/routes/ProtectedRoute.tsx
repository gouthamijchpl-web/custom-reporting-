import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks';
import { RoutePath } from './paths';

/**
 * Gate for authenticated areas of the application.
 *
 * While the session is still being restored it shows a loading state rather than
 * redirecting, otherwise a reload would bounce a signed-in user to the login screen. The
 * attempted location is passed along so the user returns to it after signing in.
 *
 * This is a usability guard, not a security boundary: the API rejects unauthenticated
 * requests independently, so a user who bypasses the router still sees nothing.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initialising') {
    return <LoadingState fillHeight message="Restoring your session…" />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={RoutePath.login} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

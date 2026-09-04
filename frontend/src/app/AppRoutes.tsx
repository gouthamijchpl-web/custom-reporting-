import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { DataUploadPage } from '@/pages/app/DataUploadPage';
import { NotFoundPage } from '@/pages/app/NotFoundPage';
import { ReportsPage } from '@/pages/app/ReportsPage';
import { SettingsPage } from '@/pages/app/SettingsPage';
import { WorkspacePage } from '@/pages/app/WorkspacePage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute';
import { DEFAULT_AUTHENTICATED_ROUTE, RoutePath } from '@/routes/paths';

/**
 * The route table.
 *
 * Public and authenticated areas are separated by guard routes rather than by checks
 * inside each page, so a new module is added by dropping one more {@link Route} into the
 * protected branch and nothing else.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public: reachable only while signed out. */}
      <Route element={<PublicOnlyRoute />}>
        <Route path={RoutePath.login} element={<LoginPage />} />
        <Route path={RoutePath.signup} element={<SignupPage />} />
        <Route path={RoutePath.forgotPassword} element={<ForgotPasswordPage />} />
      </Route>

      {/* Authenticated: everything behind the application shell. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={RoutePath.workspace} element={<WorkspacePage />} />
          <Route path={RoutePath.dataUpload} element={<DataUploadPage />} />
          <Route path={RoutePath.reports} element={<ReportsPage />} />
          <Route path={RoutePath.settings} element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      {/* The root sends signed-in users to the workspace and everyone else to login. */}
      <Route path={RoutePath.root} element={<Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />} />
    </Routes>
  );
}

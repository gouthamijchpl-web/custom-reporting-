import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthProvider';
import { BranchProvider } from '@/context/BranchProvider';
import { EntityProvider } from '@/context/EntityProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { ToastProvider } from '@/context/ToastProvider';
import { AppRoutes } from './AppRoutes';

/**
 * Application root.
 *
 * Providers are ordered outermost-first: theme, then session, then the account's entities
 * — which depend on there being a session — and finally routing, so every route can read
 * all three contexts.
 */
export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <EntityProvider>
            <BranchProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </BranchProvider>
          </EntityProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

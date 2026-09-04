import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ConfirmDialog, LoadingState } from '@/components/ui';
import { Breakpoint, useAuth, useMediaQuery } from '@/hooks';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import './AppLayout.css';

/**
 * Shell shared by every authenticated screen.
 *
 * Three layouts, one component: a fixed rail on desktop, an icon rail on tablet, and a
 * slide-over drawer on mobile. The active module renders through the {@link Outlet}, so
 * navigation never remounts the shell and the sidebar stays consistent everywhere.
 */
export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isMobile = useMediaQuery(Breakpoint.mobile);
  const isTablet = useMediaQuery(Breakpoint.tablet);

  const [isCollapsePreferred, setIsCollapsePreferred] = useState(false);
  const [drawerRoute, setDrawerRoute] = useState<string | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Applying the shared bright product theme to body also themes portal-based modals and drawers.
  useEffect(() => {
    document.body.classList.add('app-theme-bright');
    return () => document.body.classList.remove('app-theme-bright');
  }, []);

  // Tablets always use the icon rail; on desktop the user's own choice applies.
  const isCollapsed = isTablet || isCollapsePreferred;

  /**
   * The drawer is remembered per route rather than as a plain boolean, so any navigation
   * — including the browser back button — closes it without a synchronising effect.
   */
  const isDrawerOpen = drawerRoute === location.pathname;

  const closeDrawer = useCallback(() => setDrawerRoute(null), []);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDrawer, isDrawerOpen]);

  const handleLogout = useCallback(() => {
    setIsLoggingOut(true);
    void logout().finally(() => {
      setIsLoggingOut(false);
      setIsLogoutDialogOpen(false);
    });
  }, [logout]);

  if (!user) {
    // Only reachable in the instant between sign-out and the redirect to /login.
    return <LoadingState fillHeight message="Preparing your workspace…" />;
  }

  return (
    <div className="app-frame">
      <div className="app-layout">
      {!isMobile && (
        <div className="app-layout__rail">
          <Sidebar
            user={user}
            isCollapsed={isCollapsed}
            isDrawer={false}
            onToggleCollapse={() => setIsCollapsePreferred((current) => !current)}
            onCloseDrawer={closeDrawer}
            onNavigate={closeDrawer}
            onRequestLogout={() => setIsLogoutDialogOpen(true)}
          />
        </div>
      )}

      {isMobile && isDrawerOpen && (
        <div className="app-layout__drawer-scrim" onClick={closeDrawer} role="presentation">
          <div
            className="app-layout__drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar
              user={user}
              isCollapsed={false}
              isDrawer
              onToggleCollapse={closeDrawer}
              onCloseDrawer={closeDrawer}
              onNavigate={closeDrawer}
              onRequestLogout={() => {
                closeDrawer();
                setIsLogoutDialogOpen(true);
              }}
            />
          </div>
        </div>
      )}

      <div className="app-layout__main">
        <AppHeader
          user={user}
          isCompact={isMobile}
          onOpenNavigation={() => setDrawerRoute(location.pathname)}
        />

        <main className="app-layout__content" id="main-content">
          <div className="app-layout__container">
            <Outlet />
          </div>
        </main>
      </div>

        <ConfirmDialog
          isOpen={isLogoutDialogOpen}
          title="Log out?"
          message="You will need to sign in again to get back to your workspace."
          confirmLabel="Log out"
          cancelLabel="Stay signed in"
          isDestructive
          isConfirming={isLoggingOut}
          onConfirm={handleLogout}
          onCancel={() => setIsLogoutDialogOpen(false)}
        />
      </div>
    </div>
  );
}

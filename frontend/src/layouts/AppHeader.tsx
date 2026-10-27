import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PRIMARY_NAVIGATION, SETTINGS_NAVIGATION } from '@/app/navigation';
import { BrandLogo, LogoutIcon, MenuIcon } from '@/components/icons';
import { BranchSwitcher, EntitySwitcher } from '@/features/entities';
import { cx } from '@/utils/classNames';
import { toInitials } from '@/utils/formatters';
import type { AuthenticatedUser } from '@/types';
import './AppHeader.css';

interface AppHeaderProps {
  user: AuthenticatedUser;
  /** True below the tablet breakpoint, where the sidebar becomes a drawer. */
  isCompact: boolean;
  onOpenNavigation: () => void;
  onRequestLogout: () => void;
}

/**
 * Header bar shown on every authenticated screen.
 *
 * It sits to the right of the sidebar on desktop and spans the full width on mobile, where
 * it also carries the button that opens the navigation drawer. The entity switcher is
 * anchored to the right so the active entity is visible from every module.
 */
export function AppHeader({ user, isCompact, onOpenNavigation, onRequestLogout }: AppHeaderProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountOpen) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAccountOpen]);

  return (
    <header className="app-header">
      {isCompact && (
        <button
          type="button"
          className="app-header__menu"
          onClick={onOpenNavigation}
          aria-label="Open navigation"
          aria-haspopup="dialog"
        >
          <MenuIcon size={20} />
        </button>
      )}

      <NavLink className="app-header__brand" to="/workspace" aria-label="Custom Reporting home">
        <BrandLogo size={38} />
        <span className="app-header__brand-name">Custom Reporting</span>
      </NavLink>

      {!isCompact && (
        <nav className="app-header__nav" aria-label="Main navigation">
          {[...PRIMARY_NAVIGATION, SETTINGS_NAVIGATION].map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => cx('app-header__nav-link', isActive && 'app-header__nav-link--active')}
              title={item.description}
            >
              <span className="app-header__nav-icon">{item.icon}</span>
              <span className="app-header__nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <div className="app-header__actions">
        <EntitySwitcher />
        <BranchSwitcher />
        <div className="app-header__account" ref={accountRef}>
          <button
            type="button"
            className="app-header__avatar"
            onClick={() => setIsAccountOpen((current) => !current)}
            aria-label={`Open account details for ${user.fullName}`}
            aria-haspopup="dialog"
            aria-expanded={isAccountOpen}
          >
            {toInitials(user.fullName)}
          </button>

          {isAccountOpen && (
            <div className="app-header__account-popover" role="dialog" aria-label="Account details">
              <span className="app-header__account-avatar" aria-hidden="true">
                {toInitials(user.fullName)}
              </span>
              <span className="app-header__account-text">
                <strong title={user.fullName}>{user.fullName}</strong>
                <span title={user.email}>{user.email}</span>
              </span>
              <button
                type="button"
                className="app-header__account-logout"
                onClick={() => {
                  setIsAccountOpen(false);
                  onRequestLogout();
                }}
              >
                <LogoutIcon size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

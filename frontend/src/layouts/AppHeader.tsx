import { BrandLogo, MenuIcon } from '@/components/icons';
import { BranchSwitcher, EntitySwitcher } from '@/features/entities';
import { toInitials } from '@/utils/formatters';
import type { AuthenticatedUser } from '@/types';
import './AppHeader.css';

interface AppHeaderProps {
  user: AuthenticatedUser;
  /** True below the tablet breakpoint, where the sidebar becomes a drawer. */
  isCompact: boolean;
  onOpenNavigation: () => void;
}

/**
 * Header bar shown on every authenticated screen.
 *
 * It sits to the right of the sidebar on desktop and spans the full width on mobile, where
 * it also carries the button that opens the navigation drawer. The entity switcher is
 * anchored to the right so the active entity is visible from every module.
 */
export function AppHeader({ user, isCompact, onOpenNavigation }: AppHeaderProps) {
  return (
    <header className="app-header">
      {isCompact && (
        <>
          <button
            type="button"
            className="app-header__menu"
            onClick={onOpenNavigation}
            aria-label="Open navigation"
            aria-haspopup="dialog"
          >
            <MenuIcon size={20} />
          </button>

          <span className="app-header__brand">
            <BrandLogo size={26} />
            <span className="app-header__brand-name">Custom Reporting</span>
          </span>
        </>
      )}

      <div className="app-header__actions">
        <EntitySwitcher />
        <BranchSwitcher />
        <span className="app-header__avatar" title={user.fullName} aria-hidden="true">
          {toInitials(user.fullName)}
        </span>
      </div>
    </header>
  );
}

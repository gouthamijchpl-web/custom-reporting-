import { NavLink } from 'react-router-dom';
import { PRIMARY_NAVIGATION, SETTINGS_NAVIGATION, type NavigationItem } from '@/app/navigation';
import { BrandLogo, ChevronLeftIcon, ChevronRightIcon, CloseIcon, LogoutIcon } from '@/components/icons';
import { cx } from '@/utils/classNames';
import './Sidebar.css';

interface SidebarProps {
  /** Icon-only mode, used on tablet and when the user collapses the rail. */
  isCollapsed: boolean;
  /** True when rendered inside the mobile drawer rather than as a fixed rail. */
  isDrawer: boolean;
  onToggleCollapse: () => void;
  onCloseDrawer: () => void;
  /** Called after any navigation, so the mobile drawer closes itself. */
  onNavigate: () => void;
  onRequestLogout: () => void;
}

/**
 * Primary navigation rail.
 *
 * The same component serves the fixed desktop rail and the mobile drawer; only the
 * surrounding chrome differs. Ordering is fixed by design: Workspace, Data Upload and
 * Reports at the top, then flexible space, with Settings and logout pinned to the bottom.
 */
export function Sidebar({
  isCollapsed,
  isDrawer,
  onToggleCollapse,
  onCloseDrawer,
  onNavigate,
  onRequestLogout,
}: SidebarProps) {
  const showLabels = !isCollapsed || isDrawer;

  return (
    <aside
      className={cx('sidebar', isCollapsed && !isDrawer && 'sidebar--collapsed', isDrawer && 'sidebar--drawer')}
      aria-label="Main navigation"
    >
      <div className="sidebar__brand">
        {showLabels ? (
          <>
            <span className="sidebar__brand-mark">
              <BrandLogo size={30} />
            </span>
            <span className="sidebar__brand-text">
              <span className="sidebar__brand-name">Custom Reporting</span>
              <span className="sidebar__brand-tagline">Reporting workspace</span>
            </span>

            {isDrawer ? (
              <button
                type="button"
                className="sidebar__chrome-button"
                onClick={onCloseDrawer}
                aria-label="Close navigation"
              >
                <CloseIcon size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="sidebar__chrome-button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronLeftIcon size={18} />
              </button>
            )}
          </>
        ) : (
          /*
           * There is no room for a separate control in the icon rail, so the mark itself
           * expands it. Without this the sidebar could be collapsed and never reopened.
           */
          <button
            type="button"
            className="sidebar__brand-toggle"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <span className="sidebar__brand-toggle-mark">
              <BrandLogo size={30} />
            </span>
            <span className="sidebar__brand-toggle-hint" aria-hidden="true">
              <ChevronRightIcon size={16} />
            </span>
          </button>
        )}
      </div>

      <nav className="sidebar__nav" aria-label="Modules">
        <ul className="sidebar__list">
          {PRIMARY_NAVIGATION.map((item) => (
            <SidebarLink key={item.id} item={item} showLabel={showLabels} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <ul className="sidebar__list">
          <SidebarLink item={SETTINGS_NAVIGATION} showLabel={showLabels} onNavigate={onNavigate} />
        </ul>

        <button
          type="button"
          className={cx('sidebar__logout', !showLabels && 'sidebar__logout--compact')}
          onClick={onRequestLogout}
          title="Log out"
        >
          <LogoutIcon size={18} />
          {showLabels && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}

interface SidebarLinkProps {
  item: NavigationItem;
  showLabel: boolean;
  onNavigate: () => void;
}

function SidebarLink({ item, showLabel, onNavigate }: SidebarLinkProps) {
  return (
    <li>
      <NavLink
        to={item.path}
        className={({ isActive }) => cx('sidebar__link', isActive && 'sidebar__link--active')}
        onClick={onNavigate}
        title={showLabel ? item.description : item.label}
      >
        <span className="sidebar__link-icon">{item.icon}</span>
        {showLabel && <span className="sidebar__link-label">{item.label}</span>}
      </NavLink>
    </li>
  );
}

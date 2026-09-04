import { useMemo, useState } from 'react';
import { LoadingState, PageHeader } from '@/components/ui';
import { EntitiesSection, SecuritySection, WorkspaceSetupSection } from '@/features/settings';
import { TeamSection } from '@/features/team';
import { useAuth } from '@/hooks';
import { isAdministratorRole } from '@/types';
import { cx } from '@/utils/classNames';
import './SettingsPage.css';

type SettingsTab = 'teams' | 'workspace-setup' | 'entities' | 'security';

interface TabDefinition {
  id: SettingsTab;
  label: string;
  /** When true the tab is only offered to administrators. */
  adminOnly?: boolean;
}

const TABS: ReadonlyArray<TabDefinition> = [
  { id: 'teams', label: 'Teams', adminOnly: true },
  { id: 'workspace-setup', label: 'Workspace Setup' },
  { id: 'entities', label: 'Entities' },
  { id: 'security', label: 'Security' },
];

/**
 * Settings, grouped into tabs so new configuration areas can be added by extending
 * {@link TABS} and rendering one more section, without reworking the page.
 *
 * Teams is hidden from anyone who is not an administrator. That is presentation only —
 * the team endpoints reject non-administrators outright, so hiding the tab saves a user
 * from a screen they cannot use rather than being what protects it.
 */
export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(null);

  const isAdmin = isAdministratorRole(user?.role);
  const visibleTabs = useMemo(() => TABS.filter((tab) => !tab.adminOnly || isAdmin), [isAdmin]);
  const selectedTab = activeTab ?? (isAdmin ? 'teams' : 'security');

  if (!user) {
    return <LoadingState fillHeight />;
  }

  return (
    <div className="settings-page">
      <PageHeader title="Settings" description="Manage your workspace, team and security." />

      <div className="settings-page__tabs" role="tablist" aria-label="Settings sections">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`settings-tab-${tab.id}`}
            aria-selected={selectedTab === tab.id}
            aria-controls={`settings-panel-${tab.id}`}
            className={cx('settings-page__tab', selectedTab === tab.id && 'settings-page__tab--active')}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="settings-page__panel"
        role="tabpanel"
        id={`settings-panel-${selectedTab}`}
        aria-labelledby={`settings-tab-${selectedTab}`}
      >
        {selectedTab === 'teams' && isAdmin && <TeamSection />}

        {selectedTab === 'workspace-setup' && <WorkspaceSetupSection />}

        {selectedTab === 'entities' && <EntitiesSection />}

        {selectedTab === 'security' && <SecuritySection />}
      </div>
    </div>
  );
}

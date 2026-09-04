import type { ReactNode } from 'react';
import { ReportsIcon, SettingsIcon, UploadIcon, WorkspaceIcon } from '@/components/icons';
import { RoutePath } from '@/routes/paths';

export interface NavigationItem {
  /** Stable key, also used for test hooks. */
  id: string;
  label: string;
  path: string;
  icon: ReactNode;
  /** Short explanation surfaced as the link title attribute. */
  description: string;
}

/**
 * Primary navigation, in the order it appears in the sidebar.
 *
 * Settings is kept out of this list on purpose: it is pinned to the bottom of the sidebar
 * and is defined separately below.
 */
export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    path: RoutePath.workspace,
    icon: <WorkspaceIcon />,
    description: 'Your reporting workspace',
  },
  {
    id: 'data-upload',
    label: 'Data Upload',
    path: RoutePath.dataUpload,
    icon: <UploadIcon />,
    description: 'Bring source data into the platform',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: RoutePath.reports,
    icon: <ReportsIcon />,
    description: 'Build and manage reports',
  },
];

/** Pinned to the bottom of the sidebar, above the profile block. */
export const SETTINGS_NAVIGATION: NavigationItem = {
  id: 'settings',
  label: 'Settings',
  path: RoutePath.settings,
  icon: <SettingsIcon />,
  description: 'Account, preferences and security',
};

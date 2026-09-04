import type { SelectOption } from '@/components/ui';
import { ACCESS_STATUS_LABELS, ROLE_LABELS } from '@/types';
import type { AccessStatus, Role } from '@/types';

export const ROLE_OPTIONS: ReadonlyArray<SelectOption<Role>> = [
  { value: 'ADMIN', label: ROLE_LABELS.ADMIN },
  { value: 'USER', label: ROLE_LABELS.USER },
  { value: 'OWNER', label: ROLE_LABELS.OWNER },
];

export const ACCESS_STATUS_OPTIONS: ReadonlyArray<SelectOption<AccessStatus>> = [
  { value: 'PENDING', label: ACCESS_STATUS_LABELS.PENDING },
  { value: 'ACTIVE', label: ACCESS_STATUS_LABELS.ACTIVE },
  { value: 'INACTIVE', label: ACCESS_STATUS_LABELS.INACTIVE },
];

/** Filter dropdowns carry an extra "any" entry, represented by the empty string. */
export const ROLE_FILTER_OPTIONS: ReadonlyArray<SelectOption<Role | ''>> = [
  { value: '', label: 'All roles' },
  ...ROLE_OPTIONS,
];

export const STATUS_FILTER_OPTIONS: ReadonlyArray<SelectOption<AccessStatus | ''>> = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: ACCESS_STATUS_LABELS.ACTIVE },
  { value: 'PENDING', label: ACCESS_STATUS_LABELS.PENDING },
  { value: 'INACTIVE', label: ACCESS_STATUS_LABELS.INACTIVE },
];

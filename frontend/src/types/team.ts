/** Team membership payloads exchanged with /api/v1/team/users. */

/** Coarse application roles. Kept open for finer permissions later. */
export type Role = 'USER' | 'ADMIN' | 'OWNER';

/**
 * Whether an account may use the application, which is separate from whether it exists.
 *
 * - `ACTIVE` — registered, approved and able to sign in.
 * - `INACTIVE` — the account exists but entry has been withdrawn.
 * - `PENDING` — invited or self-registered, but not yet cleared for entry.
 */
export type AccessStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  accessStatus: AccessStatus;
  /** False for someone an administrator added who has not yet set a password. */
  registered: boolean;
  /** True for the signed-in administrator's own row, so self-actions can be disabled. */
  self: boolean;
  addedOn: string;
  lastLoginAt: string | null;
}

export interface CreateTeamMemberRequest {
  fullName: string;
  email: string;
  role: Role;
  accessStatus: AccessStatus;
}

/** The email address is deliberately absent — it is the login identifier. */
export interface UpdateTeamMemberRequest {
  fullName: string;
  role: Role;
  accessStatus: AccessStatus;
}

export interface TeamFilters {
  search: string;
  role: Role | '';
  status: AccessStatus | '';
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  USER: 'Member',
  OWNER: 'Owner',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Can manage application settings and team members.',
  USER: 'Can use the application but cannot manage team members.',
  OWNER: 'Has full access to the workspace and team administration.',
};

export function isAdministratorRole(role: Role | undefined): boolean {
  return role === 'ADMIN' || role === 'OWNER';
}

export const ACCESS_STATUS_LABELS: Record<AccessStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
};

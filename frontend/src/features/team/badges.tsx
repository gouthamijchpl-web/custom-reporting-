import { Badge } from '@/components/ui';
import { ACCESS_STATUS_LABELS, ROLE_LABELS } from '@/types';
import type { AccessStatus, Role } from '@/types';
import type { BadgeTone } from '@/components/ui';

/**
 * Status colours carry meaning consistently across the Teams screen: green for access
 * granted, amber for waiting, grey for withheld.
 */
const STATUS_TONES: Record<AccessStatus, BadgeTone> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  INACTIVE: 'neutral',
};

export function AccessStatusBadge({ status }: { status: AccessStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]} withDot>
      {ACCESS_STATUS_LABELS[status]}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={role === 'USER' ? 'neutral' : 'accent'}>{ROLE_LABELS[role]}</Badge>;
}

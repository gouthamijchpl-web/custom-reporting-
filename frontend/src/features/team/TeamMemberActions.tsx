import { EditIcon } from '@/components/icons';
import type { TeamMember } from '@/types';
import './TeamMemberActions.css';

interface TeamMemberActionsProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
}

/** A visible row action avoids menus being clipped by the responsive table scroller. */
export function TeamMemberActions({ member, onEdit }: TeamMemberActionsProps) {
  return (
    <button
      type="button"
      className="member-actions__edit"
      onClick={() => onEdit(member)}
      aria-label={`Edit ${member.fullName}`}
    >
      <EditIcon size={15} />
      <span>Edit</span>
    </button>
  );
}

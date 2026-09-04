import { Breakpoint, useMediaQuery } from '@/hooks';
import { formatDateTime } from '@/utils/formatters';
import { AccessStatusBadge, RoleBadge } from './badges';
import { TeamMemberActions } from './TeamMemberActions';
import type { TeamMember } from '@/types';
import './TeamMemberList.css';

interface TeamMemberListProps {
  members: TeamMember[];
  onEdit: (member: TeamMember) => void;
}

/**
 * The team roster.
 *
 * A table is the right shape for this data on a wide screen and the wrong one on a narrow
 * screen, so below the tablet breakpoint each member becomes a card instead. Switching the
 * markup rather than restyling the table avoids a row that either overflows sideways or
 * collapses into unlabelled fragments.
 */
export function TeamMemberList({ members, onEdit }: TeamMemberListProps) {
  const isCompact = useMediaQuery(Breakpoint.mobile);

  const actionsFor = (member: TeamMember) => (
    <TeamMemberActions member={member} onEdit={onEdit} />
  );

  if (isCompact) {
    return (
      <ul className="member-cards">
        {members.map((member) => (
          <li key={member.id} className="member-card">
            <div className="member-card__head">
              <div className="member-card__identity">
                <span className="member-card__name">
                  {member.fullName}
                  {member.self && <span className="member-list__you">You</span>}
                </span>
                <span className="member-card__email">{member.email}</span>
              </div>
              {actionsFor(member)}
            </div>

            <dl className="member-card__facts">
              <div>
                <dt>Role</dt>
                <dd>
                  <RoleBadge role={member.role} />
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <AccessStatusBadge status={member.accessStatus} />
                </dd>
              </div>
              <div>
                <dt>Added on</dt>
                <dd>{formatDateTime(member.addedOn)}</dd>
              </div>
              <div>
                <dt>Last login</dt>
                <dd>{member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Never'}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="member-table__scroll">
      <table className="member-table">
        <caption className="sr-only">Team members and their access to the application</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">Added on</th>
            <th scope="col">Last login</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td className="member-table__name">
                {member.fullName}
                {member.self && <span className="member-list__you">You</span>}
              </td>
              <td className="member-table__email" title={member.email}>
                {member.email}
              </td>
              <td>
                <RoleBadge role={member.role} />
              </td>
              <td>
                <AccessStatusBadge status={member.accessStatus} />
              </td>
              <td className="member-table__muted">{formatDateTime(member.addedOn)}</td>
              <td className="member-table__muted">
                {member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Never'}
              </td>
              <td className="member-table__actions">{actionsFor(member)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, teamApi } from '@/api';
import { PlusIcon, SearchIcon, UsersIcon } from '@/components/icons';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LoadingState,
  Select,
  TextInput,
} from '@/components/ui';
import { ROLE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from './options';
import { TeamMemberDialog } from './TeamMemberDialog';
import { TeamMemberList } from './TeamMemberList';
import type { AccessStatus, Role, TeamFilters, TeamMember } from '@/types';
import './TeamSection.css';

const NO_FILTERS: TeamFilters = { search: '', role: '', status: '' };

/** Debounce for the search box, so typing does not issue a request per keystroke. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Team management: who may use the application, and with what role.
 *
 * Filtering runs on the server rather than over a local copy, so the list stays correct as
 * the team grows past whatever would fit comfortably in one response.
 *
 * Every destructive or access-changing action is confirmed first, and the rules that
 * protect an administrator from locking themselves out are enforced by the backend — the
 * disabled menu items here only save a pointless round trip.
 */
export function TeamSection() {
  const [filters, setFilters] = useState<TeamFilters>(NO_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  const [dialogMember, setDialogMember] = useState<TeamMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Typing updates the input immediately but the query only after a pause.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const query = useMemo(
    () => ({ search: appliedSearch, role: filters.role, status: filters.status }),
    [appliedSearch, filters.role, filters.status],
  );

  /** Not an async function, so no state update can run synchronously inside the effect. */
  const load = useCallback(
    (): Promise<void> =>
      teamApi
        .list(query)
        .then((loaded) => {
          setMembers(loaded);
          setLoadError(null);
        })
        .catch((error: unknown) => {
          setLoadError(error instanceof ApiError ? error.message : 'Unable to load the team right now.');
        })
        .finally(() => setIsReloading(false)),
    [query],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    setIsReloading(true);
    void load();
  }, [load]);

  const openAddDialog = useCallback(() => {
    setDialogMember(null);
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((member: TeamMember) => {
    setDialogMember(member);
    setIsDialogOpen(true);
  }, []);

  const hasFilters = Boolean(appliedSearch || filters.role || filters.status);
  const isFirstLoad = members === null && loadError === null;

  return (
    <>
      <Card className="team-card">
        <CardHeader
          icon={<UsersIcon size={18} />}
          title="Teams"
          description="Manage users and control their access to the application."
          actions={
            <Button leadingIcon={<PlusIcon size={16} />} onClick={openAddDialog}>
              Add User
            </Button>
          }
        />

        <div className="team-toolbar">
          <div className="team-toolbar__search">
            <TextInput
              id="team-search"
              type="search"
              placeholder="Search by name or email…"
              aria-label="Search team members"
              leadingIcon={<SearchIcon size={16} />}
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </div>

          <div className="team-toolbar__filters">
            <Select<Role | ''>
              id="team-role-filter"
              aria-label="Filter by role"
              options={ROLE_FILTER_OPTIONS}
              value={filters.role}
              onValueChange={(role) =>
                setFilters((current) => ({ ...current, role }))
              }
            />
            <Select<AccessStatus | ''>
              id="team-status-filter"
              aria-label="Filter by access status"
              options={STATUS_FILTER_OPTIONS}
              value={filters.status}
              onValueChange={(status) =>
                setFilters((current) => ({ ...current, status }))
              }
            />
          </div>
        </div>

        {isFirstLoad && <LoadingState message="Loading team members…" />}

        {loadError && (
          <CardBody>
            <Alert variant="danger" title="Could not load the team">
              <p>{loadError}</p>
              <Button variant="secondary" size="sm" className="team-retry" onClick={reload}>
                Try again
              </Button>
            </Alert>
          </CardBody>
        )}

        {members !== null && !loadError && (
          <div className="team-list" aria-busy={isReloading}>
            {members.length === 0 ? (
              <CardBody>
                {hasFilters ? (
                  <EmptyState
                    icon={<SearchIcon size={24} />}
                    title="No matching team members"
                    description="No one matches the current search and filters. Try widening them."
                    action={
                      <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={<UsersIcon size={24} />}
                    title="No team members yet"
                    description="Add users to give them access to this workspace."
                    action={
                      <Button leadingIcon={<PlusIcon size={16} />} onClick={openAddDialog}>
                        Add User
                      </Button>
                    }
                  />
                )}
              </CardBody>
            ) : (
              <TeamMemberList
                members={members}
                onEdit={openEditDialog}
              />
            )}
          </div>
        )}
      </Card>

      {/* Keyed so the form resets whenever a different member is opened. */}
      <TeamMemberDialog
        key={dialogMember?.id ?? 'new-member'}
        isOpen={isDialogOpen}
        member={dialogMember}
        onClose={() => setIsDialogOpen(false)}
        onSaved={reload}
      />
    </>
  );
}

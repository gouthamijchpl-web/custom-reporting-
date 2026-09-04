package com.customreporting.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Looks up by login identifier, removed accounts included.
     *
     * <p>Sign-in needs the removed record too, so it can answer "your access has been
     * withdrawn" rather than "no such account".</p>
     */
    Optional<User> findByEmail(String email);

    /**
     * Whether the address is taken at all. Removed members keep their row and their
     * address, so this stays true for them and the address cannot be quietly reassigned.
     */
    boolean existsByEmail(String email);

    Optional<User> findByIdAndDeletedAtIsNull(UUID id);

    /**
     * Team listing with optional search and filters.
     *
     * <p>Each filter is skipped when its parameter is null, which keeps one query for
     * every combination instead of a method per permutation.</p>
     *
     * @param search lower-cased, already wrapped in {@code %} by the caller, or null
     */
    @Query("""
            select member from User member
            where member.deletedAt is null
              and (:role is null or member.role = :role)
              and (:status is null or member.accessStatus = :status)
              and (:search is null
                   or lower(member.fullName) like :search
                   or lower(member.email) like :search)
            order by member.createdAt asc
            """)
    List<User> searchTeamMembers(@Param("search") String search,
                                 @Param("role") Role role,
                                 @Param("status") AccessStatus status);

    /** Used to guarantee the application is never left without an administrator. */
    long countByRoleAndAccessStatusAndDeletedAtIsNull(Role role, AccessStatus accessStatus);

    long countByDeletedAtIsNull();

    /** The earliest account, used to appoint the first administrator on a fresh install. */
    Optional<User> findFirstByDeletedAtIsNullOrderByCreatedAtAsc();
}

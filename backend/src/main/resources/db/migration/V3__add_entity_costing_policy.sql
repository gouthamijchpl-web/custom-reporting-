create table entity_costing_policy_revisions (
    id uuid primary key,
    entity_id uuid not null,
    costing_method varchar(32) not null,
    effective_from date,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_costing_policy_entity foreign key (entity_id) references reporting_entities (id),
    constraint ck_costing_policy_method check (costing_method in ('FIFO', 'MOVING_WEIGHTED_AVERAGE'))
);

create index ix_costing_policy_entity_effective
    on entity_costing_policy_revisions (entity_id, effective_from);


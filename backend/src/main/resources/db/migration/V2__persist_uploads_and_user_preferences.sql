create table uploaded_data_states (
    id uuid primary key,
    scope_key varchar(100) not null,
    entity_id uuid not null,
    branch_id uuid null,
    updated_by uuid not null,
    payload_json text not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_uploaded_data_states_scope unique (scope_key),
    constraint fk_uploaded_data_states_entity foreign key (entity_id) references reporting_entities (id),
    constraint fk_uploaded_data_states_branch foreign key (branch_id) references entity_branches (id),
    constraint fk_uploaded_data_states_user foreign key (updated_by) references users (id)
);

create index ix_uploaded_data_states_entity on uploaded_data_states (entity_id);

create table application_user_preferences (
    id uuid primary key,
    user_id uuid not null,
    preference_key varchar(100) not null,
    value_json text not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_application_user_preferences_key unique (user_id, preference_key),
    constraint fk_application_user_preferences_user foreign key (user_id) references users (id)
);

create index ix_application_user_preferences_user on application_user_preferences (user_id);

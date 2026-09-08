-- Supabase projects can contain provider-managed objects while having no application
-- tables. In that case baseline-on-migrate records version 1 and Flyway must still create
-- the application's original schema before later migrations add dependent tables.

create table if not exists users (
    id uuid primary key,
    full_name varchar(120) not null,
    email varchar(254) not null,
    password_hash varchar(100) not null,
    role varchar(20) not null,
    enabled boolean not null,
    access_status varchar(20) default 'ACTIVE' not null,
    deleted_at timestamp with time zone,
    failed_login_attempts integer not null,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    credentials_changed_at timestamp with time zone not null,
    credentials_version integer default 0 not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_users_email unique (email),
    constraint ck_users_role check (role in ('USER', 'ADMIN', 'OWNER')),
    constraint ck_users_access_status check (access_status in ('ACTIVE', 'INACTIVE', 'PENDING'))
);

create table if not exists business_groups (
    id uuid primary key,
    owner_id uuid not null,
    name varchar(120) not null,
    series_code varchar(12) not null,
    active boolean not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_business_groups_name unique (name),
    constraint ux_business_groups_series_code unique (series_code),
    constraint fk_business_groups_owner foreign key (owner_id) references users (id)
);

create table if not exists reporting_entities (
    id uuid primary key,
    owner_id uuid not null,
    group_id uuid,
    name varchar(120) not null,
    code varchar(12),
    description varchar(500),
    pan varchar(10),
    primary_gstin varchar(15),
    gstn_username varchar(120),
    gstn_password_encrypted varchar(2048),
    tally_company_name varchar(120),
    tally_host varchar(255) default 'localhost' not null,
    tally_port integer default 9000 not null,
    multiple_branches boolean default false not null,
    e_invoice_enabled boolean default false not null,
    e_way_bill_enabled boolean default false not null,
    stock_enabled boolean default false not null,
    cost_centre_extraction_enabled boolean default false not null,
    active boolean not null,
    archived_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_reporting_entities_owner_name unique (owner_id, name),
    constraint ux_reporting_entities_owner_code unique (owner_id, code),
    constraint fk_reporting_entities_owner foreign key (owner_id) references users (id),
    constraint fk_reporting_entities_group foreign key (group_id) references business_groups (id)
);

create table if not exists entity_branches (
    id uuid primary key,
    entity_id uuid not null,
    name varchar(120) not null,
    code varchar(20) not null,
    primary_branch boolean not null,
    active boolean not null,
    archived_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_branch_entity_code unique (entity_id, code),
    constraint fk_entity_branches_entity foreign key (entity_id) references reporting_entities (id)
);

create table if not exists entity_books (
    id uuid primary key,
    entity_id uuid not null,
    name varchar(120) not null,
    source varchar(20) not null,
    primary_book boolean not null,
    active boolean not null,
    tally_company_name varchar(120),
    tally_host varchar(255),
    tally_port integer,
    zoho_client_id varchar(255),
    zoho_client_secret_encrypted varchar(2048),
    zoho_accounts_domain varchar(255),
    zoho_api_domain varchar(255),
    zoho_organization_id varchar(100),
    zoho_organization_name varchar(160),
    zoho_access_token_encrypted varchar(4096),
    zoho_refresh_token_encrypted varchar(4096),
    zoho_token_expires_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_entity_books_source check (source in ('TALLY', 'ZOHO_BOOKS')),
    constraint fk_entity_books_entity foreign key (entity_id) references reporting_entities (id)
);

create table if not exists entity_gstins (
    id uuid primary key,
    entity_id uuid not null,
    book_id uuid,
    branch_id uuid,
    gstin varchar(15) not null,
    state_name varchar(80) not null,
    registration_type varchar(30) not null,
    gstn_username varchar(120),
    gstn_password_encrypted varchar(2048),
    active boolean not null,
    e_invoice_applicable boolean not null,
    archived_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_entity_gstins_registration_type check (
        registration_type in ('REGULAR', 'COMPOSITION', 'CASUAL_TAXABLE_PERSON', 'SEZ', 'OTHER')
    ),
    constraint fk_entity_gstins_entity foreign key (entity_id) references reporting_entities (id),
    constraint fk_entity_gstins_book foreign key (book_id) references entity_books (id),
    constraint fk_entity_gstins_branch foreign key (branch_id) references entity_branches (id)
);

create table if not exists entity_selections (
    id uuid primary key,
    user_id uuid not null,
    selected_entity_id uuid,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_entity_selections_user unique (user_id),
    constraint fk_entity_selections_user foreign key (user_id) references users (id),
    constraint fk_entity_selections_entity foreign key (selected_entity_id) references reporting_entities (id)
);

create table if not exists password_reset_tokens (
    id uuid primary key,
    user_id uuid not null,
    token_hash varchar(64) not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_password_reset_tokens_hash unique (token_hash),
    constraint fk_password_reset_tokens_user foreign key (user_id) references users (id)
);

create table if not exists refresh_tokens (
    id uuid primary key,
    user_id uuid not null,
    token_hash varchar(64) not null,
    expires_at timestamp with time zone not null,
    revoked_at timestamp with time zone,
    remember_me boolean not null,
    user_agent varchar(300),
    ip_address varchar(45),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_refresh_tokens_hash unique (token_hash),
    constraint fk_refresh_tokens_user foreign key (user_id) references users (id)
);

create table if not exists workspace_configuration (
    id uuid primary key,
    name varchar(120) not null,
    code varchar(20) not null,
    description varchar(500),
    active boolean not null,
    default_currency varchar(3) not null,
    time_zone varchar(80) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ux_workspace_configuration_code unique (code)
);

create index if not exists ix_business_groups_owner on business_groups (owner_id);
create index if not exists ix_reporting_entities_owner on reporting_entities (owner_id);
create index if not exists ix_reporting_entities_group on reporting_entities (group_id);
create index if not exists ix_branch_entity on entity_branches (entity_id);
create index if not exists ix_book_entity on entity_books (entity_id);
create index if not exists ix_gstin_entity on entity_gstins (entity_id);
create index if not exists ix_password_reset_tokens_user on password_reset_tokens (user_id);
create index if not exists ix_refresh_tokens_user on refresh_tokens (user_id);

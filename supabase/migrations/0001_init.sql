-- Scope V2 — Phase 1 schema
-- Multi-tenant-aware from day 1 (only the 'grounded' tenant for Phase 1).
-- RLS policies are DEFINED but DISABLED at this point — Day 7 (ticket 6.1)
-- enables them after cross-tenant smoke tests pass.

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Tenants -------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  primary_color text,
  secondary_color text,
  tagline text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.tenants is 'Customer / org. Phase 1 has only ''grounded''.';

-- Profile rows shadowing auth.users ----------------------------------------
-- The Supabase auth.users table is managed by GoTrue; we keep our own row to
-- attach a tenant_id, full_name, role. id is the same uuid as auth.users.id.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  email text unique,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create index users_tenant_idx on public.users(tenant_id);

-- Reports (user-generated via the build flow) ------------------------------
-- The 376 hand-curated library reports stay in src/data/reports.json. This
-- table only holds reports authored through /api/build (or imported later).
create table public.reports (
  id text primary key,                 -- NEW-XXXXXX from build route
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  author_id uuid references public.users(id) on delete set null,
  title text not null,
  focus_area text,
  comparison_type text,
  industry text,
  pack_size text,
  annual_volume integer,
  confidence text not null default 'medium',
  summary text,
  notes text,
  options jsonb not null,              -- Option[] from src/lib/types.ts
  meta jsonb,                          -- ReportMeta from src/lib/types.ts
  query_text text,                     -- original NL query
  source text not null default 'build',-- 'build' | 'imported' | 'forked'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_tenant_created_idx
  on public.reports(tenant_id, created_at desc);
create index reports_author_idx on public.reports(author_id);

-- Tenant-scoped overrides for engine inputs --------------------------------
create table public.materials_override (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  material_library_entry text not null,
  override_payload jsonb not null,
  reason text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, material_library_entry)
);

create table public.assumptions_override (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  assumption_key text not null,
  value jsonb not null,
  reason text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, assumption_key)
);

-- Audit log -----------------------------------------------------------------
create table public.audit_log (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  action text not null,                -- 'report.create' | 'override.update' | ...
  target_type text,                    -- 'report' | 'materials_override' | ...
  target_id text,
  diff jsonb,
  at timestamptz not null default now()
);

create index audit_tenant_at_idx on public.audit_log(tenant_id, at desc);

-- updated_at trigger helper -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reports_touch_updated_at
  before update on public.reports
  for each row execute function public.touch_updated_at();

-- RLS policies — defined now, ENABLED on Day 7 (ticket 6.1) -----------------
-- The shape is "see and mutate rows where tenant_id matches the caller's
-- tenant from public.users". service_role bypasses RLS so /api/build (which
-- uses service_role) is unaffected by enable/disable.

alter table public.tenants disable row level security;
alter table public.users disable row level security;
alter table public.reports disable row level security;
alter table public.materials_override disable row level security;
alter table public.assumptions_override disable row level security;
alter table public.audit_log disable row level security;

create policy tenants_read on public.tenants
  for select using (
    id = (select tenant_id from public.users where id = auth.uid())
  );

create policy users_read on public.users
  for select using (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
  );

create policy reports_tenant_select on public.reports
  for select using (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
  );

create policy reports_tenant_insert on public.reports
  for insert with check (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
  );

create policy reports_tenant_update on public.reports
  for update using (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
  );

create policy materials_override_tenant on public.materials_override
  for all using (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
  );

create policy assumptions_override_tenant on public.assumptions_override
  for all using (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
  );

create policy audit_log_tenant_read on public.audit_log
  for select using (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
  );

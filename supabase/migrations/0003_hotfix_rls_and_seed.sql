-- Day 3 hotfix
-- 1) Re-disable RLS on all Phase 1 tables. Supabase keeps RLS on for public-
--    schema tables; my 0001 disable didn't stick. Day 7 re-enables with
--    non-recursive policies (the original `users_read` referenced public.users
--    inside its own USING clause, causing infinite recursion when evaluated).
-- 2) Drop the broken policies so they don't fire if anyone enables RLS without
--    rewriting first. Day 7 ticket 6.1 puts proper ones back.
-- 3) Re-seed the grounded tenant — 0002 didn't run because it was pasted
--    together with a second copy of 0001 that aborted on `tenants already
--    exists`.

drop policy if exists tenants_read              on public.tenants;
drop policy if exists users_read                on public.users;
drop policy if exists reports_tenant_select     on public.reports;
drop policy if exists reports_tenant_insert     on public.reports;
drop policy if exists reports_tenant_update     on public.reports;
drop policy if exists materials_override_tenant on public.materials_override;
drop policy if exists assumptions_override_tenant on public.assumptions_override;
drop policy if exists audit_log_tenant_read     on public.audit_log;

alter table public.tenants              disable row level security;
alter table public.users                disable row level security;
alter table public.reports              disable row level security;
alter table public.materials_override   disable row level security;
alter table public.assumptions_override disable row level security;
alter table public.audit_log            disable row level security;

insert into public.tenants (slug, name, primary_color, tagline)
values (
  'grounded',
  'Grounded Packaging',
  '#5B5BD6',
  'Dynamic LCA for the materials decisions that change the answer.'
)
on conflict (slug) do nothing;

-- Sanity check — should return 1.
select count(*) as tenant_count from public.tenants;

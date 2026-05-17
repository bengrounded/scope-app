-- Add a free-text `customer` column to reports.
-- The build-wizard review step surfaces this as a tagging field; the
-- TenantReportsTable adds it as a column. Nullable because existing
-- reports don't have it (and many never will — internal-use reports).
-- Indexed because the Phase 2 customer-filter dropdown will read it.

alter table public.reports
  add column if not exists customer text;

create index if not exists reports_tenant_customer_idx
  on public.reports(tenant_id, customer)
  where customer is not null;

select count(*) as report_count,
       count(customer) as with_customer
  from public.reports;

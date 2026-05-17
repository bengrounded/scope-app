-- Store the original ParsedReport alongside the rendered Report so the
-- clone-and-modify flow can faithfully restore engine inputs (composition,
-- manufacturing_process, manufacturing_grid, eol_pathway) without having
-- to re-parse from the rendered display fields. Nullable for backfill
-- compatibility — existing rows have no payload; cloning them falls
-- back to the synthesizer that runs Claude on the rendered Report.

alter table public.reports
  add column if not exists parsed_payload jsonb;

select count(*) as report_count,
       count(parsed_payload) as with_parsed_payload
  from public.reports;

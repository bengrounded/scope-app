-- Ticket 3.3 — seed the Grounded tenant for Phase 1.
-- Idempotent: re-running is a no-op.

insert into public.tenants (slug, name, primary_color, tagline)
values (
  'grounded',
  'Grounded Packaging',
  '#5B5BD6',                 -- indigo accent matching the prototype
  'Dynamic LCA for the materials decisions that change the answer.'
)
on conflict (slug) do nothing;

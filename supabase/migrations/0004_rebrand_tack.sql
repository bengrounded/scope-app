-- Rebrand to Scope by Tack.
-- Update the grounded tenant theme colours to the Tack blue palette so the
-- tenant-scoped routes (/t/grounded/*) inherit the same brand accent as the
-- root pages (landing, login). If a Phase 2 customer wants their own brand,
-- just update their tenants row.

update public.tenants
   set primary_color   = '#1F66FF',
       secondary_color = '#5C92FF',
       tagline         = 'Dynamic LCA for the materials decisions that change the answer.'
 where slug = 'grounded';

select id, slug, name, primary_color, secondary_color from public.tenants;

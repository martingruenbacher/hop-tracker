-- Allow beer logs and map pubs outside the original three trip cities.
-- Run this once in Supabase SQL Editor.

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select table_schema, table_name, constraint_name
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name in ('beer_logs', 'pubs')
      and constraint_type = 'CHECK'
      and constraint_name ilike '%city%'
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      constraint_record.table_schema,
      constraint_record.table_name,
      constraint_record.constraint_name
    );
  end loop;
end $$;

-- A newly inserted trip must be visible to its owner immediately, including
-- during INSERT ... RETURNING before the membership trigger can be relied on.
-- This also lets owners recover access if a membership row is missing.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trips'
      and policyname = 'owners read own trips'
  ) then
    create policy "owners read own trips" on public.trips
    for select to authenticated
    using (owner_id = auth.uid());
  end if;
end $$;

-- Stop clock times are derived in the client. Legacy scheduled_time is retained
-- for old data, but is no longer used as the schedule source of truth.
alter table public.trips
  add column if not exists home_base_lat double precision,
  add column if not exists home_base_lng double precision;

alter table public.stops
  add column if not exists address text,
  add column if not exists place_id text,
  add column if not exists category text not null default 'other',
  add column if not exists estimated_duration_minutes integer not null default 60,
  add column if not exists is_anchor boolean not null default false,
  add column if not exists photo_url text,
  add column if not exists estimated_cost numeric(12,2),
  add column if not exists opening_hours text;

alter table public.legs
  add column if not exists travel_mode text not null default 'driving',
  add column if not exists is_manual_override boolean not null default false;

create table if not exists public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  day_start_time time not null default '09:00',
  unique (trip_id, date)
);
create index if not exists trip_days_trip_date_idx on public.trip_days(trip_id, date);
alter table public.trip_days enable row level security;
grant select, insert, update, delete on public.trip_days to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'trip_days' and policyname = 'members read trip days') then
    create policy "members read trip days" on public.trip_days for select to authenticated using (public.is_trip_member(trip_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'trip_days' and policyname = 'editors manage trip days') then
    create policy "editors manage trip days" on public.trip_days for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_stop_category' and conrelid = 'public.stops'::regclass) then
    alter table public.stops add constraint trip_stop_category check (category in ('accommodation','food','attraction','nightlife','transport','shopping','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_stop_duration' and conrelid = 'public.stops'::regclass) then
    alter table public.stops add constraint trip_stop_duration check (estimated_duration_minutes between 1 and 1440);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_stop_cost' and conrelid = 'public.stops'::regclass) then
    alter table public.stops add constraint trip_stop_cost check (estimated_cost is null or estimated_cost >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_leg_mode' and conrelid = 'public.legs'::regclass) then
    alter table public.legs add constraint trip_leg_mode check (travel_mode in ('driving','walking','cycling','transit','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_home_base_lat' and conrelid = 'public.trips'::regclass) then
    alter table public.trips add constraint trip_home_base_lat check (home_base_lat is null or home_base_lat between -90 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_home_base_lng' and conrelid = 'public.trips'::regclass) then
    alter table public.trips add constraint trip_home_base_lng check (home_base_lng is null or home_base_lng between -180 and 180);
  end if;
end $$;

-- Keep the order previously shown by the app before scheduled_time stops
-- participating in sorting.
with ranked as (
  select id, row_number() over (
    partition by trip_id, day
    order by scheduled_time nulls last, order_index, created_at, id
  ) - 1 as new_order
  from public.stops
)
update public.stops s set order_index = ranked.new_order
from ranked where s.id = ranked.id and s.order_index is distinct from ranked.new_order;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_days') then
    alter publication supabase_realtime add table public.trip_days;
  end if;
end $$;

create extension if not exists pgcrypto;

create type public.trip_member_role as enum ('owner', 'editor', 'viewer');
create type public.expense_split_type as enum ('equal', 'custom');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  destination text not null check (char_length(destination) between 1 and 160),
  start_date date not null,
  end_date date not null,
  cover_photo_url text,
  owner_id uuid not null references public.profiles(id),
  default_vehicle_capacity integer not null default 4 check (default_vehicle_capacity > 0),
  currency text not null default 'THB' check (currency ~ '^[A-Z]{3}$'),
  transport_base_fare numeric(12,2) not null default 0 check (transport_base_fare >= 0),
  transport_per_km_rate numeric(12,2) not null default 0 check (transport_per_km_rate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_trip_dates check (end_date >= start_date)
);

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.trip_member_role not null default 'editor',
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  lat double precision,
  lng double precision,
  day date not null,
  scheduled_time time,
  notes text,
  order_index integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_latitude check (lat is null or lat between -90 and 90),
  constraint valid_longitude check (lng is null or lng between -180 and 180)
);

create table public.stop_participants (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references public.stops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (stop_id, user_id)
);

create table public.legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_stop_id uuid not null references public.stops(id) on delete cascade,
  to_stop_id uuid not null references public.stops(id) on delete cascade,
  estimated_minutes integer check (estimated_minutes >= 0),
  estimated_distance_km numeric(10,2) check (estimated_distance_km >= 0),
  estimated_cost numeric(12,2) check (estimated_cost >= 0),
  num_vehicles integer not null default 1 check (num_vehicles >= 0),
  computed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint distinct_leg_stops check (from_stop_id <> to_stop_id),
  unique (trip_id, from_stop_id, to_stop_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 240),
  amount numeric(12,2) not null check (amount >= 0),
  paid_by_user_id uuid not null references public.profiles(id),
  split_type public.expense_split_type not null default 'equal',
  related_leg_id uuid references public.legs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_owed numeric(12,2) not null check (amount_owed >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, user_id)
);

create index trip_members_user_id_idx on public.trip_members(user_id);
create index trip_invites_trip_id_idx on public.trip_invites(trip_id);
create index stops_trip_day_order_idx on public.stops(trip_id, day, order_index);
create index stop_participants_user_id_idx on public.stop_participants(user_id);
create index legs_trip_id_idx on public.legs(trip_id);
create index expenses_trip_id_idx on public.expenses(trip_id, created_at desc);
create index expense_splits_user_id_idx on public.expense_splits(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger trips_set_updated_at before update on public.trips
for each row execute function public.set_updated_at();
create trigger stops_set_updated_at before update on public.stops
for each row execute function public.set_updated_at();
create trigger legs_set_updated_at before update on public.legs
for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.add_trip_owner()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_trip_created
after insert on public.trips
for each row execute function public.add_trip_owner();

create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = target_trip_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_trip(target_trip_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = target_trip_id
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;
alter table public.stops enable row level security;
alter table public.stop_participants enable row level security;
alter table public.legs enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;

grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update, delete on public.trip_members to authenticated;
grant select, insert, update, delete on public.trip_invites to authenticated;
grant select, insert, update, delete on public.stops to authenticated;
grant select, insert, update, delete on public.stop_participants to authenticated;
grant select, insert, update, delete on public.legs to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.expense_splits to authenticated;

create policy "profiles visible to trip peers" on public.profiles for select to authenticated
using (
  id = auth.uid() or exists (
    select 1 from public.trip_members mine
    join public.trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);
create policy "users update own profile" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "members read trips" on public.trips for select to authenticated
using (public.is_trip_member(id));
create policy "users create owned trips" on public.trips for insert to authenticated
with check (owner_id = auth.uid());
create policy "editors update trips" on public.trips for update to authenticated
using (public.can_edit_trip(id)) with check (public.can_edit_trip(id));
create policy "owners delete trips" on public.trips for delete to authenticated
using (owner_id = auth.uid());

create policy "members read memberships" on public.trip_members for select to authenticated
using (public.is_trip_member(trip_id));
create policy "owners manage memberships" on public.trip_members for all to authenticated
using (
  exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
)
with check (
  exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
);

create policy "editors manage invites" on public.trip_invites for all to authenticated
using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy "members read stops" on public.stops for select to authenticated
using (public.is_trip_member(trip_id));
create policy "editors create stops" on public.stops for insert to authenticated
with check (public.can_edit_trip(trip_id) and created_by = auth.uid());
create policy "editors update stops" on public.stops for update to authenticated
using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy "editors delete stops" on public.stops for delete to authenticated
using (public.can_edit_trip(trip_id));

create policy "members read stop participants" on public.stop_participants for select to authenticated
using (exists (select 1 from public.stops where id = stop_id and public.is_trip_member(trip_id)));
create policy "members join stops" on public.stop_participants for insert to authenticated
with check (
  user_id = auth.uid() and exists (
    select 1 from public.stops where id = stop_id and public.is_trip_member(trip_id)
  )
);
create policy "members leave stops" on public.stop_participants for delete to authenticated
using (
  user_id = auth.uid() or exists (
    select 1 from public.stops where id = stop_id and public.can_edit_trip(trip_id)
  )
);

create policy "members read legs" on public.legs for select to authenticated
using (public.is_trip_member(trip_id));
create policy "editors manage legs" on public.legs for all to authenticated
using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy "members read expenses" on public.expenses for select to authenticated
using (public.is_trip_member(trip_id));
create policy "editors create expenses" on public.expenses for insert to authenticated
with check (public.can_edit_trip(trip_id));
create policy "editors update expenses" on public.expenses for update to authenticated
using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy "editors delete expenses" on public.expenses for delete to authenticated
using (public.can_edit_trip(trip_id));

create policy "members read expense splits" on public.expense_splits for select to authenticated
using (exists (select 1 from public.expenses where id = expense_id and public.is_trip_member(trip_id)));
create policy "editors manage expense splits" on public.expense_splits for all to authenticated
using (exists (select 1 from public.expenses where id = expense_id and public.can_edit_trip(trip_id)))
with check (exists (select 1 from public.expenses where id = expense_id and public.can_edit_trip(trip_id)));

create or replace function public.accept_trip_invite(invite_token uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  invited_trip_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select trip_id into invited_trip_id
  from public.trip_invites
  where token = invite_token and (expires_at is null or expires_at > now());

  if invited_trip_id is null then raise exception 'Invite is invalid or expired'; end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (invited_trip_id, auth.uid(), 'editor')
  on conflict (trip_id, user_id) do nothing;

  return invited_trip_id;
end;
$$;

create or replace function public.get_trip_invite_snapshot(invite_token uuid)
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  select jsonb_build_object(
    'trip', to_jsonb(t),
    'stops', coalesce((select jsonb_agg(to_jsonb(s) order by s.day, s.order_index) from public.stops s where s.trip_id = t.id), '[]'::jsonb),
    'legs', coalesce((select jsonb_agg(to_jsonb(l)) from public.legs l where l.trip_id = t.id), '[]'::jsonb)
  )
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where i.token = invite_token and (i.expires_at is null or i.expires_at > now());
$$;

revoke all on function public.accept_trip_invite(uuid) from public;
revoke all on function public.get_trip_invite_snapshot(uuid) from public;
grant execute on function public.accept_trip_invite(uuid) to authenticated;
grant execute on function public.get_trip_invite_snapshot(uuid) to anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['trips', 'trip_members', 'stops', 'stop_participants', 'legs', 'expenses', 'expense_splits']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

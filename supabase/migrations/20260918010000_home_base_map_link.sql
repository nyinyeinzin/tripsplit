alter table public.trips
  add column if not exists home_base_map_url text;

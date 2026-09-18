-- Keep destination for existing trips and legacy itinerary/route displays.
alter table public.trips
  add column if not exists destination_country_code text,
  add column if not exists first_city text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'destination_country_code_format' and conrelid = 'public.trips'::regclass) then
    alter table public.trips add constraint destination_country_code_format check (destination_country_code is null or destination_country_code ~ '^[A-Z]{2}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'first_city_length' and conrelid = 'public.trips'::regclass) then
    alter table public.trips add constraint first_city_length check (first_city is null or char_length(first_city) between 1 and 120);
  end if;
end $$;

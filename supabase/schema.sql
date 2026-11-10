-- NOVICE MVP database schema
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query > paste > Run).
-- It creates the tables, privacy rules (row level security), and the functions the app calls.
-- Safe to re-run on an empty project. To start over, see the reset block at the bottom.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.intent_level as enum ('curious', 'join', 'ready');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per user. Created automatically when someone signs up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 60),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Things people can put on a Never-Done List. Suggested ones are seeded below;
-- users can add their own (custom) ones.
create table if not exists public.interests (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  category text not null default 'Other',
  is_suggested boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists interests_name_unique on public.interests (lower(btrim(name)));

-- A user's Never-Done List. Private: only the owner can read their own rows.
create table if not exists public.list_items (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  interest_id bigint not null references public.interests (id) on delete cascade,
  intent public.intent_level not null default 'curious',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

-- Peer-organized plans.
create table if not exists public.plans (
  id bigint generated always as identity primary key,
  interest_id bigint not null references public.interests (id) on delete cascade,
  organizer_id uuid not null default auth.uid(),
  title text not null check (char_length(btrim(title)) between 4 and 80),
  starts_at timestamptz not null,
  location text not null check (char_length(btrim(location)) between 2 and 120),
  details text check (details is null or char_length(details) <= 500),
  capacity int not null, -- limits depend on the plan kind; see plans_capacity_check below
  status text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint plans_organizer_id_fkey foreign key (organizer_id) references public.profiles (id) on delete cascade
);
create index if not exists plans_interest_idx on public.plans (interest_id, starts_at);

-- Who has joined a plan. The organizer is added automatically.
create table if not exists public.plan_members (
  plan_id bigint not null references public.plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  attended boolean, -- self-reported after the plan: true = went, false = didn't, null = not answered
  primary key (plan_id, user_id)
);

-- Simple, non-real-time coordination messages on a plan. Only members can read or post.
create table if not exists public.plan_messages (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists plan_messages_plan_idx on public.plan_messages (plan_id, created_at);

-- Safety reports. Nobody can read these through the app; review them in the Supabase dashboard.
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  plan_id bigint references public.plans (id) on delete set null,
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now()
);

-- One row per user per day they open the app. Used for the return-visit metric.
create table if not exists public.app_visits (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null default (now() at time zone 'America/Detroit')::date,
  primary key (user_id, day)
);

-- Business hosts (studios, gyms, venues). Same login as a regular member: a host is a user with
-- a business profile attached. Self-serve: anyone signed in can create one and post right away.
-- Only the NOVICE team can set verified = true (Table Editor > hosts); it shows a badge.
create table if not exists public.hosts (
  id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  business_name text not null check (char_length(btrim(business_name)) between 2 and 80),
  website text check (website is null or char_length(website) <= 200),
  about text check (about is null or char_length(about) <= 400),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists hosts_name_unique on public.hosts (lower(btrim(business_name)));

-- Plans come in two kinds:
--   peer:   organized by a member, free, 2 to 30 people, organizer counts as a member.
--   hosted: listed by a business host, may show a price paid at the venue (NOVICE never takes
--           payment), 2 to 200 spots, the host is NOT a member (capacity = attendee spots).
-- Written as ALTERs so re-running this file upgrades a database created before hosts existed.
alter table public.plans add column if not exists kind text not null default 'peer';
alter table public.plans add column if not exists price_cents int;
alter table public.plans drop constraint if exists plans_kind_check;
alter table public.plans add constraint plans_kind_check check (kind in ('peer', 'hosted'));
alter table public.plans drop constraint if exists plans_capacity_check;
alter table public.plans add constraint plans_capacity_check
  check (capacity >= 2 and capacity <= case when kind = 'hosted' then 200 else 30 end);
alter table public.plans drop constraint if exists plans_price_check;
alter table public.plans add constraint plans_price_check
  check (price_cents is null or (kind = 'hosted' and price_cents between 0 and 100000));
create index if not exists plans_organizer_idx on public.plans (organizer_id, starts_at);

-- ---------------------------------------------------------------------------
-- Row level security (who can see and change what)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.interests enable row level security;
alter table public.list_items enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_messages enable row level security;
alter table public.reports enable row level security;
alter table public.app_visits enable row level security;
alter table public.hosts enable row level security;

-- Signed-out visitors get nothing.
revoke all on all tables in schema public from anon;

-- Profiles: you see your own, plus the first names of people who organize or join plans
-- (joining a plan is the moment you agree to be visible). Interests alone never reveal you.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or exists (select 1 from public.plans p where p.organizer_id = profiles.id)
  or exists (select 1 from public.plan_members m where m.user_id = profiles.id)
);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Interests: everyone signed in can read; anyone can add a custom one.
drop policy if exists interests_select on public.interests;
create policy interests_select on public.interests for select to authenticated using (true);
drop policy if exists interests_insert on public.interests;
create policy interests_insert on public.interests for insert to authenticated
  with check (created_by = auth.uid() and is_suggested = false);

-- Never-Done Lists: owner only.
drop policy if exists list_items_all on public.list_items;
create policy list_items_all on public.list_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Hosts: business profiles are public to signed-in users. You can create and edit only your own,
-- and never set verified yourself (see the column grants below).
drop policy if exists hosts_select on public.hosts;
create policy hosts_select on public.hosts for select to authenticated using (true);
drop policy if exists hosts_insert on public.hosts;
create policy hosts_insert on public.hosts for insert to authenticated
  with check (id = auth.uid() and verified = false);
drop policy if exists hosts_update on public.hosts;
create policy hosts_update on public.hosts for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Plans: readable by everyone signed in; only the organizer can create/cancel their own.
-- Only people with a host profile can create hosted plans.
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans for select to authenticated using (true);
drop policy if exists plans_insert on public.plans;
create policy plans_insert on public.plans for insert to authenticated
  with check (
    organizer_id = auth.uid() and status = 'open'
    and (kind = 'peer' or exists (select 1 from public.hosts h where h.id = auth.uid()))
  );
drop policy if exists plans_update on public.plans;
create policy plans_update on public.plans for update to authenticated
  using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());

-- Plan members: visible to everyone signed in (so people can see who's going);
-- you can only add, update, or remove yourself.
drop policy if exists plan_members_select on public.plan_members;
create policy plan_members_select on public.plan_members for select to authenticated using (true);
drop policy if exists plan_members_insert on public.plan_members;
create policy plan_members_insert on public.plan_members for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists plan_members_update on public.plan_members;
create policy plan_members_update on public.plan_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists plan_members_delete on public.plan_members;
create policy plan_members_delete on public.plan_members for delete to authenticated
  using (user_id = auth.uid());

-- Messages: members of the plan, plus its organizer (hosts aren't members of hosted plans).
drop policy if exists plan_messages_select on public.plan_messages;
create policy plan_messages_select on public.plan_messages for select to authenticated using (
  exists (select 1 from public.plan_members m where m.plan_id = plan_messages.plan_id and m.user_id = auth.uid())
  or exists (select 1 from public.plans p where p.id = plan_messages.plan_id and p.organizer_id = auth.uid())
);
drop policy if exists plan_messages_insert on public.plan_messages;
create policy plan_messages_insert on public.plan_messages for insert to authenticated with check (
  user_id = auth.uid()
  and (
    exists (select 1 from public.plan_members m where m.plan_id = plan_messages.plan_id and m.user_id = auth.uid())
    or exists (select 1 from public.plans p where p.id = plan_messages.plan_id and p.organizer_id = auth.uid())
  )
);

-- Reports: insert only.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- Visits: your own only.
drop policy if exists app_visits_all on public.app_visits;
create policy app_visits_all on public.app_visits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Column-level limits on top of the row rules.
revoke update on public.profiles from authenticated;
grant update (display_name, neighborhood, onboarded) on public.profiles to authenticated;
revoke update on public.plan_members from authenticated;
grant update (attended) on public.plan_members to authenticated;
revoke update on public.plans from authenticated;
grant update (status) on public.plans to authenticated;
revoke insert, update on public.hosts from authenticated;
grant insert (id, business_name, website, about) on public.hosts to authenticated;
grant update (business_name, website, about) on public.hosts to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile when someone signs up. The app sends display_name in the sign-up metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on list items.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists list_items_touch on public.list_items;
create trigger list_items_touch before update on public.list_items
  for each row execute function public.touch_updated_at();

-- Before someone joins: plan must be open, in the future, and not full.
create or replace function public.check_plan_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.plans; n int;
begin
  select * into p from public.plans where id = new.plan_id for update;
  if not found then raise exception 'This plan no longer exists.'; end if;
  if p.status <> 'open' then raise exception 'This plan was cancelled.'; end if;
  if p.starts_at <= now() then raise exception 'This plan has already started.'; end if;
  if p.kind = 'hosted' and p.organizer_id = new.user_id then
    raise exception 'You''re hosting this one, so you don''t need a spot.';
  end if;
  select count(*) into n from public.plan_members where plan_id = new.plan_id;
  if n >= p.capacity then raise exception 'This plan is full.'; end if;
  return new;
end $$;
drop trigger if exists plan_members_check on public.plan_members;
create trigger plan_members_check before insert on public.plan_members
  for each row execute function public.check_plan_join();

-- After someone joins: make sure the interest is on their list, marked "ready".
create or replace function public.after_plan_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare iid bigint;
begin
  select interest_id into iid from public.plans where id = new.plan_id;
  insert into public.list_items (user_id, interest_id, intent)
  values (new.user_id, iid, 'ready')
  on conflict (user_id, interest_id) do update
    set intent = 'ready'
    where public.list_items.completed_at is null;
  return new;
end $$;
drop trigger if exists plan_members_after on public.plan_members;
create trigger plan_members_after after insert on public.plan_members
  for each row execute function public.after_plan_join();

-- Peer organizers are members of their own plan. Hosts are not members of hosted plans.
create or replace function public.after_plan_create()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'peer' then
    insert into public.plan_members (plan_id, user_id) values (new.id, new.organizer_id);
  end if;
  return new;
end $$;
drop trigger if exists plans_after_create on public.plans;
create trigger plans_after_create after insert on public.plans
  for each row execute function public.after_plan_create();

-- ---------------------------------------------------------------------------
-- Functions the app calls (all run with the caller's permissions unless noted)
-- ---------------------------------------------------------------------------

create or replace function public.my_profile()
returns table (id uuid, display_name text, neighborhood text, onboarded boolean)
language sql stable set search_path = public as $$
  select id, display_name, neighborhood, onboarded from public.profiles where id = auth.uid();
$$;

create or replace function public.update_profile(p_display_name text, p_neighborhood text)
returns void language plpgsql set search_path = public as $$
begin
  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 40 then
    raise exception 'Name must be 1 to 40 characters.';
  end if;
  update public.profiles
     set display_name = btrim(p_display_name),
         neighborhood = nullif(btrim(coalesce(p_neighborhood, '')), '')
   where id = auth.uid();
end $$;

create or replace function public.finish_onboarding()
returns void language sql set search_path = public as $$
  update public.profiles set onboarded = true where id = auth.uid();
$$;

-- Anonymous counts per interest. Runs with elevated rights so it can count across everyone's
-- private lists, but it only ever returns totals, never who.
create or replace function public.interest_stats()
returns table (
  interest_id bigint, name text, category text, is_suggested boolean,
  listed int, want_join int, ready int, done int, open_plans int
)
language sql stable security definer set search_path = public as $$
  select
    i.id, i.name, i.category, i.is_suggested,
    count(li.user_id) filter (where li.completed_at is null)::int,
    count(li.user_id) filter (where li.completed_at is null and li.intent in ('join', 'ready'))::int,
    count(li.user_id) filter (where li.completed_at is null and li.intent = 'ready')::int,
    count(li.user_id) filter (where li.completed_at is not null)::int,
    (select count(*) from public.plans p
      where p.interest_id = i.id and p.status = 'open' and p.starts_at > now())::int
  from public.interests i
  left join public.list_items li on li.interest_id = i.id
  where i.is_suggested
     or exists (select 1 from public.list_items x where x.interest_id = i.id)
     or exists (select 1 from public.plans x where x.interest_id = i.id)
  group by i.id
  order by i.name;
$$;

create or replace function public.my_list()
returns table (
  interest_id bigint, name text, category text, intent public.intent_level,
  completed_at timestamptz, created_at timestamptz
)
language sql stable set search_path = public as $$
  select li.interest_id, i.name, i.category, li.intent, li.completed_at, li.created_at
  from public.list_items li join public.interests i on i.id = li.interest_id
  where li.user_id = auth.uid()
  order by li.created_at desc;
$$;

create or replace function public.add_to_list(p_interest_id bigint, p_intent public.intent_level default 'curious')
returns void language sql set search_path = public as $$
  insert into public.list_items (user_id, interest_id, intent)
  values (auth.uid(), p_interest_id, p_intent)
  on conflict (user_id, interest_id) do update
    set completed_at = null, intent = excluded.intent;
$$;

-- Add a custom interest (or reuse an existing one with the same name) and put it on your list.
create or replace function public.add_custom_interest(p_name text)
returns bigint language plpgsql set search_path = public as $$
declare clean text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'); iid bigint;
begin
  if char_length(clean) not between 2 and 60 then
    raise exception 'Use 2 to 60 characters.';
  end if;
  select id into iid from public.interests where lower(btrim(name)) = lower(clean);
  if iid is null then
    insert into public.interests (name, category, is_suggested, created_by)
    values (clean, 'Other', false, auth.uid())
    on conflict do nothing
    returning id into iid;
    if iid is null then
      select id into iid from public.interests where lower(btrim(name)) = lower(clean);
    end if;
  end if;
  insert into public.list_items (user_id, interest_id) values (auth.uid(), iid)
  on conflict (user_id, interest_id) do update set completed_at = null;
  return iid;
end $$;

create or replace function public.set_intent(p_interest_id bigint, p_intent public.intent_level)
returns void language sql set search_path = public as $$
  insert into public.list_items (user_id, interest_id, intent)
  values (auth.uid(), p_interest_id, p_intent)
  on conflict (user_id, interest_id) do update set intent = excluded.intent;
$$;

create or replace function public.remove_from_list(p_interest_id bigint)
returns void language sql set search_path = public as $$
  delete from public.list_items where user_id = auth.uid() and interest_id = p_interest_id;
$$;

create or replace function public.mark_done(p_interest_id bigint, p_done boolean)
returns void language sql set search_path = public as $$
  update public.list_items
     set completed_at = case when p_done then now() else null end
   where user_id = auth.uid() and interest_id = p_interest_id;
$$;

-- ---------- Hosts ----------
create or replace function public.my_host()
returns table (id uuid, business_name text, website text, about text, verified boolean)
language sql stable set search_path = public as $$
  select id, business_name, website, about, verified from public.hosts where id = auth.uid();
$$;

-- Create or update your business profile.
create or replace function public.save_host(p_business_name text, p_website text, p_about text)
returns void language plpgsql set search_path = public as $$
declare
  n text := regexp_replace(btrim(coalesce(p_business_name, '')), '\s+', ' ', 'g');
  w text := nullif(btrim(coalesce(p_website, '')), '');
  a text := nullif(btrim(coalesce(p_about, '')), '');
begin
  if char_length(n) not between 2 and 80 then
    raise exception 'Business name must be 2 to 80 characters.';
  end if;
  if w is not null and w !~* '^https?://' then w := 'https://' || w; end if;
  if w is not null and (char_length(w) > 200 or w !~* '^https?://[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$') then
    raise exception 'That website address doesn''t look right.';
  end if;
  if a is not null and char_length(a) > 400 then
    raise exception 'Keep the description under 400 characters.';
  end if;
  begin
    insert into public.hosts (id, business_name, website, about) values (auth.uid(), n, w, a)
    on conflict (id) do update
      set business_name = excluded.business_name, website = excluded.website, about = excluded.about;
  exception when unique_violation then
    raise exception 'Another host already uses that business name.';
  end;
end $$;

-- ---------- Plans ----------
-- Old 6-argument version, replaced by the one below. Dropped so the app never calls it by mistake.
drop function if exists public.create_plan(bigint, text, timestamptz, text, text, int);
create or replace function public.create_plan(
  p_interest_id bigint, p_title text, p_starts_at timestamptz,
  p_location text, p_details text, p_capacity int,
  p_as_host boolean default false, p_price_cents int default null
) returns bigint language plpgsql set search_path = public as $$
declare pid bigint;
begin
  if p_starts_at <= now() then raise exception 'Choose a time in the future.'; end if;
  if p_starts_at > now() + interval '120 days' then raise exception 'Choose a date within the next 4 months.'; end if;
  if p_as_host and not exists (select 1 from public.hosts where id = auth.uid()) then
    raise exception 'Set up your host profile first.';
  end if;
  insert into public.plans (interest_id, organizer_id, title, starts_at, location, details, capacity, kind, price_cents)
  values (p_interest_id, auth.uid(), btrim(p_title), p_starts_at, btrim(p_location),
          nullif(btrim(coalesce(p_details, '')), ''), p_capacity,
          case when p_as_host then 'hosted' else 'peer' end,
          case when p_as_host then p_price_cents end)
  returning id into pid;
  return pid;
end $$;

-- Organizers (peer or host) can change an upcoming plan's details. Runs with elevated rights
-- because members can't update plan columns directly; it checks the caller is the organizer.
create or replace function public.update_plan(
  p_plan_id bigint, p_title text, p_starts_at timestamptz, p_location text,
  p_details text, p_capacity int, p_price_cents int default null
) returns void language plpgsql security definer set search_path = public as $$
declare p public.plans; n int;
begin
  select * into p from public.plans where id = p_plan_id for update;
  if not found or p.organizer_id is distinct from auth.uid() then
    raise exception 'Only the organizer can edit this plan.';
  end if;
  if p.status <> 'open' then raise exception 'Cancelled plans can''t be edited.'; end if;
  if p.starts_at <= now() then raise exception 'This plan has already started.'; end if;
  if p_starts_at <= now() then raise exception 'Choose a time in the future.'; end if;
  if p_starts_at > now() + interval '120 days' then raise exception 'Choose a date within the next 4 months.'; end if;
  select count(*) into n from public.plan_members where plan_id = p_plan_id;
  if p_capacity < n then
    raise exception '% people are already going. Group size can''t be smaller than that.', n;
  end if;
  update public.plans
     set title = btrim(p_title),
         starts_at = p_starts_at,
         location = btrim(p_location),
         details = nullif(btrim(coalesce(p_details, '')), ''),
         capacity = p_capacity,
         price_cents = case when p.kind = 'hosted' then p_price_cents end
   where id = p_plan_id;
end $$;

-- Plans with organizer, host, and member info. Filters are optional.
-- Dropped first because its columns changed (Postgres can't replace a function's return type).
drop function if exists public.plans_feed(bigint, bigint, boolean);
create or replace function public.plans_feed(
  p_interest_id bigint default null, p_plan_id bigint default null, p_mine boolean default false
) returns table (
  id bigint, interest_id bigint, interest_name text, category text,
  title text, starts_at timestamptz, location text, details text, capacity int, status text,
  organizer_id uuid, organizer_name text, member_count int, members jsonb,
  is_member boolean, my_attended boolean,
  kind text, price_cents int, host_name text, host_verified boolean, host_website text
)
language sql stable set search_path = public as $$
  select
    p.id, p.interest_id, i.name, i.category,
    p.title, p.starts_at, p.location, p.details, p.capacity, p.status,
    p.organizer_id, op.display_name,
    (select count(*) from public.plan_members m where m.plan_id = p.id)::int,
    coalesce((
      select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', pr.display_name) order by m.joined_at)
      from public.plan_members m left join public.profiles pr on pr.id = m.user_id
      where m.plan_id = p.id
    ), '[]'::jsonb),
    exists (select 1 from public.plan_members m where m.plan_id = p.id and m.user_id = auth.uid()),
    (select m.attended from public.plan_members m where m.plan_id = p.id and m.user_id = auth.uid()),
    p.kind, p.price_cents, h.business_name, coalesce(h.verified, false), h.website
  from public.plans p
  join public.interests i on i.id = p.interest_id
  left join public.profiles op on op.id = p.organizer_id
  left join public.hosts h on h.id = p.organizer_id and p.kind = 'hosted'
  where (p_interest_id is null or p.interest_id = p_interest_id)
    and (p_plan_id is null or p.id = p_plan_id)
    and (not p_mine or exists (select 1 from public.plan_members m where m.plan_id = p.id and m.user_id = auth.uid()))
  order by p.starts_at;
$$;

create or replace function public.join_plan(p_plan_id bigint)
returns void language sql set search_path = public as $$
  insert into public.plan_members (plan_id, user_id) values (p_plan_id, auth.uid())
  on conflict do nothing;
$$;

create or replace function public.leave_plan(p_plan_id bigint)
returns void language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.plans where id = p_plan_id and organizer_id = auth.uid()) then
    raise exception 'Organizers can cancel the plan instead of leaving it.';
  end if;
  delete from public.plan_members where plan_id = p_plan_id and user_id = auth.uid();
end $$;

create or replace function public.cancel_plan(p_plan_id bigint)
returns void language plpgsql set search_path = public as $$
begin
  update public.plans set status = 'cancelled' where id = p_plan_id and organizer_id = auth.uid();
  if not found then raise exception 'Only the organizer can cancel this plan.'; end if;
end $$;

-- After a plan happens, members say whether they went. Going marks the interest as a "first".
create or replace function public.set_attended(p_plan_id bigint, p_attended boolean)
returns void language plpgsql set search_path = public as $$
declare p public.plans;
begin
  select * into p from public.plans where id = p_plan_id;
  if not found then raise exception 'Plan not found.'; end if;
  if p.starts_at > now() then raise exception 'You can check in after the plan starts.'; end if;
  update public.plan_members set attended = p_attended
   where plan_id = p_plan_id and user_id = auth.uid();
  if not found then raise exception 'You are not part of this plan.'; end if;
  if p_attended then
    insert into public.list_items (user_id, interest_id, intent, completed_at)
    values (auth.uid(), p.interest_id, 'ready', now())
    on conflict (user_id, interest_id) do update set completed_at = coalesce(public.list_items.completed_at, now());
  end if;
end $$;

create or replace function public.plan_messages_for(p_plan_id bigint)
returns table (id bigint, user_id uuid, name text, body text, created_at timestamptz)
language sql stable set search_path = public as $$
  select m.id, m.user_id, pr.display_name, m.body, m.created_at
  from public.plan_messages m left join public.profiles pr on pr.id = m.user_id
  where m.plan_id = p_plan_id
  order by m.created_at;
$$;

create or replace function public.post_message(p_plan_id bigint, p_body text)
returns void language sql set search_path = public as $$
  insert into public.plan_messages (plan_id, user_id, body) values (p_plan_id, auth.uid(), btrim(p_body));
$$;

create or replace function public.report_plan(p_plan_id bigint, p_reason text)
returns void language sql set search_path = public as $$
  insert into public.reports (plan_id, reporter_id, reason) values (p_plan_id, auth.uid(), btrim(p_reason));
$$;

create or replace function public.log_visit()
returns void language sql set search_path = public as $$
  insert into public.app_visits (user_id) values (auth.uid()) on conflict do nothing;
$$;

-- Only signed-in users can call these.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Suggested interests
-- ---------------------------------------------------------------------------
insert into public.interests (name, category, is_suggested) values
  ('Wheel pottery', 'Make', true),
  ('Urban foraging', 'Outdoors', true),
  ('Partner dancing', 'Move', true),
  ('Film photography', 'Make', true),
  ('Kayaking', 'Outdoors', true),
  ('Sourdough baking', 'Cook', true),
  ('Birding', 'Outdoors', true),
  ('Improv comedy', 'Perform', true),
  ('Sewing a garment', 'Make', true),
  ('Bouldering', 'Move', true),
  ('Watercolor painting', 'Make', true),
  ('Pickleball', 'Move', true),
  ('Mushroom growing', 'Grow', true),
  ('Pasta from scratch', 'Cook', true),
  ('Open-water swimming', 'Move', true),
  ('Woodworking', 'Make', true),
  ('Stargazing', 'Outdoors', true),
  ('DJ basics', 'Perform', true),
  ('Community gardening', 'Grow', true),
  ('Screen printing', 'Make', true),
  ('Stand-up comedy', 'Perform', true),
  ('Trail running', 'Move', true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Reset (only if you need to wipe everything and start over). Leave commented out.
-- ---------------------------------------------------------------------------
-- drop table if exists public.app_visits, public.reports, public.plan_messages, public.plan_members,
--   public.plans, public.hosts, public.list_items, public.interests, public.profiles cascade;
-- drop type if exists public.intent_level;

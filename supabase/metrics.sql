-- NOVICE MVP test metrics
-- Paste into the Supabase SQL Editor. Run ONE block at a time: highlight it, then click Run
-- (the editor only shows the result of the last query when you run several at once).
-- First, put your own team's sign-in emails in the team lists below so they are excluded from results.
-- Business host accounts are real users too. If a venue signed up only to list events, add its
-- email to the team lists so it doesn't count as a tester.

-- ===== 1. Funnel: how far each tester got (the main result) =====
with team(email) as (values ('you@umich.edu'), ('teammate@umich.edu')),
testers as (
  select u.id, u.email, p.display_name
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) not in (select lower(email) from team)
),
per_user as (
  select
    t.id,
    exists (select 1 from public.list_items li where li.user_id = t.id) as added_interest,
    exists (select 1 from public.list_items li where li.user_id = t.id and li.intent in ('join','ready')) as wants_to_join,
    -- Committed = joined someone else's plan (peer or hosted), or organized a peer plan at least
    -- one other person joined. Listing a hosted experience as a business does not count.
    exists (
      select 1 from public.plan_members m join public.plans pl on pl.id = m.plan_id
      where m.user_id = t.id and pl.organizer_id <> t.id
    ) or exists (
      select 1 from public.plans pl
      where pl.organizer_id = t.id and pl.kind = 'peer'
        and exists (select 1 from public.plan_members m where m.plan_id = pl.id and m.user_id <> t.id)
    ) as committed_to_plan,
    -- Same as above, peer plans only: the core hypothesis without business-hosted events.
    exists (
      select 1 from public.plan_members m join public.plans pl on pl.id = m.plan_id
      where m.user_id = t.id and pl.organizer_id <> t.id and pl.kind = 'peer'
    ) or exists (
      select 1 from public.plans pl
      where pl.organizer_id = t.id and pl.kind = 'peer'
        and exists (select 1 from public.plan_members m where m.plan_id = pl.id and m.user_id <> t.id)
    ) as committed_to_peer_plan,
    exists (select 1 from public.plan_members m where m.user_id = t.id and m.attended) as did_it,
    (select count(distinct day) from public.app_visits v where v.user_id = t.id) >= 2 as returned
  from testers t
)
select
  count(*)                                                   as testers,
  count(*) filter (where added_interest)                     as added_an_interest,
  count(*) filter (where wants_to_join)                      as wants_to_join_others,
  count(*) filter (where committed_to_plan)                  as committed_to_a_plan,
  round(100.0 * count(*) filter (where committed_to_plan) / nullif(count(*), 0)) as pct_committed,
  count(*) filter (where committed_to_peer_plan)             as committed_to_a_peer_plan,
  count(*) filter (where did_it)                             as reported_doing_it,
  count(*) filter (where returned)                           as came_back_another_day
from per_user;

-- ===== 2. Per-tester detail (for your notes; names only) =====
with team(email) as (values ('you@umich.edu'), ('teammate@umich.edu'))
select
  p.display_name,
  (select count(*) from public.list_items li where li.user_id = u.id) as list_items,
  (select count(*) from public.list_items li join public.interests i on i.id = li.interest_id
    where li.user_id = u.id and not i.is_suggested) as custom_items,
  (select count(*) from public.plans pl where pl.organizer_id = u.id) as plans_organized,
  (select count(*) from public.plan_members m join public.plans pl on pl.id = m.plan_id
    where m.user_id = u.id and pl.organizer_id <> u.id) as plans_joined,
  (select count(*) from public.plan_members m where m.user_id = u.id and m.attended) as checked_in_went,
  (select count(distinct day) from public.app_visits v where v.user_id = u.id) as days_visited
from auth.users u join public.profiles p on p.id = u.id
where lower(u.email) not in (select lower(email) from team)
order by p.display_name;

-- ===== 3. Plans: did they fill and happen? =====
select
  pl.title, pl.kind, h.business_name as host, i.name as interest, pl.starts_at, pl.status, pl.capacity,
  (select count(*) from public.plan_members m where m.plan_id = pl.id) as members,
  (select count(*) from public.plan_members m where m.plan_id = pl.id and m.attended) as said_they_went,
  (select count(*) from public.plan_members m where m.plan_id = pl.id and m.attended = false) as said_they_did_not
from public.plans pl join public.interests i on i.id = pl.interest_id
left join public.hosts h on h.id = pl.organizer_id and pl.kind = 'hosted'
order by pl.starts_at;

-- ===== 4. Most-wanted interests (shows demand, including custom ones) =====
select name, is_suggested, listed, want_join, ready, done, open_plans
from public.interest_stats()
where listed + done > 0
order by listed + done desc, ready desc;

-- ===== 5. Safety reports =====
select r.created_at, pl.title, r.reason
from public.reports r left join public.plans pl on pl.id = r.plan_id
order by r.created_at desc;

-- ===== 6. Peer plans vs hosted experiences: which fill and actually happen? =====
select
  pl.kind,
  count(*)                                                        as plans,
  count(*) filter (where pl.status = 'cancelled')                 as cancelled,
  round(avg(mc.members), 1)                                       as avg_members,
  round(100.0 * sum(mc.members) / nullif(sum(pl.capacity), 0))    as pct_spots_filled,
  sum(mc.went)                                                    as said_they_went,
  round(100.0 * sum(mc.went) / nullif(sum(mc.answered), 0))       as pct_went_of_answered
from public.plans pl
cross join lateral (
  select count(*) as members,
         count(*) filter (where m.attended) as went,
         count(*) filter (where m.attended is not null) as answered
  from public.plan_members m where m.plan_id = pl.id
) mc
group by pl.kind;

-- ===== 7. Hosts =====
select h.business_name, h.verified, h.website, h.created_at,
  (select count(*) from public.plans pl where pl.organizer_id = h.id and pl.kind = 'hosted') as listings
from public.hosts h
order by h.created_at desc;

\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','ava@x.edu','{"display_name":"Ava"}'),
 ('00000000-0000-0000-0000-00000000000b','ben@x.edu','{"display_name":"Ben"}'),
 ('00000000-0000-0000-0000-00000000000c','cy@x.edu','{}');

create or replace function pg_temp.as_user(u text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false) $$;
create or replace function pg_temp.expect_error(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then raise notice 'PASS (blocked) %: %', label, sqlerrm; return; end;
  raise exception 'FAIL: % was allowed', label;
end $$;
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAIL: %', label; end if; raise notice 'PASS %', label; end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

select pg_temp.check((select display_name from profiles where id='00000000-0000-0000-0000-00000000000c')='cy', 'profile fallback name from email');

-- Ava
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.check((select display_name from my_profile())='Ava', 'my_profile');
select add_to_list((select id from interests where name='Wheel pottery'));
select set_intent((select id from interests where name='Wheel pottery'), 'ready');
select add_custom_interest('Climb the big rock in Gallup Park');
select add_custom_interest('  climb the big   rock in gallup park ');
select pg_temp.check((select count(*) from interests where lower(name) like 'climb the big rock%')=1, 'custom interest de-duplicated');
select pg_temp.check((select count(*) from my_list())=2, 'Ava list has 2');
select pg_temp.expect_error($q$select add_custom_interest('x')$q$, 'too-short custom interest');
select update_profile('Ava R.', 'Kerrytown');
select finish_onboarding();
select pg_temp.check((select onboarded from my_profile()), 'onboarding flag');
select pg_temp.expect_error($q$update profiles set id = gen_random_uuid() where id = auth.uid()$q$, 'change own profile id');
reset role;

-- Ben: can't see Ava's private list or profile
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select pg_temp.check((select count(*) from list_items)=0, 'Ben cannot read Ava list rows');
select pg_temp.check((select count(*) from my_list())=0, 'Ben my_list empty');
select pg_temp.check((select count(*) from profiles where display_name like 'Ava%')=0, 'Ava profile hidden before any plan');
select pg_temp.check((select listed=1 and ready=1 and want_join=1 from interest_stats() where name='Wheel pottery'), 'anonymous stats count Ava');
select pg_temp.check((select listed from interest_stats() where name like 'Climb%')=1, 'custom interest appears in stats');
select pg_temp.expect_error($q$insert into interests(name, is_suggested, created_by) values ('Fake suggested', true, auth.uid())$q$, 'mark own interest as suggested');
select pg_temp.expect_error($q$insert into list_items(user_id, interest_id) values ('00000000-0000-0000-0000-00000000000a', 1)$q$, 'write to someone else list');
reset role;

-- Ava creates a plan for 2
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.expect_error($q$select create_plan(1, 'Past plan', now() - interval '1 hour', 'Somewhere', null, 4)$q$, 'plan in the past');
select pg_temp.expect_error($q$select create_plan(1, 'Big', now() + interval '1 day', 'Somewhere', null, 50)$q$, 'capacity over 30');
select create_plan((select id from interests where name='Wheel pottery'), 'First time on the wheel', now() + interval '2 days', 'Ann Arbor Potters Guild', 'Meet at the front desk', 2);
select pg_temp.check((select member_count=1 and is_member and organizer_name='Ava R.' from plans_feed()), 'organizer auto-joined');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select pg_temp.check((select count(*) from profiles where display_name='Ava R.')=1, 'organizer name visible once she posts a plan');
select join_plan((select id from plans limit 1));
select pg_temp.check((select member_count from plans_feed())=2, 'Ben joined');
select pg_temp.check((select intent='ready' from my_list() where name='Wheel pottery'), 'joining adds interest to Ben list as ready');
select pg_temp.check((select ready from interest_stats() where name='Wheel pottery')=2, 'stats now 2 ready');
select post_message((select id from plans limit 1), 'I will wear a green jacket');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select pg_temp.expect_error($q$select join_plan((select id from plans limit 1))$q$, 'join a full plan');
select pg_temp.check((select count(*) from plan_messages_for((select id from plans limit 1)))=0, 'non-member cannot read messages');
select pg_temp.expect_error($q$select post_message((select id from plans limit 1), 'hi')$q$, 'non-member posting');
select pg_temp.expect_error($q$select cancel_plan((select id from plans limit 1))$q$, 'cancel someone else plan');
select pg_temp.expect_error($q$update plans set title='Hacked'$q$, 'edit plan title directly');
select pg_temp.check((select title from plans limit 1)='First time on the wheel', 'title unchanged');
delete from plan_members where user_id='00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select member_count from plans_feed())=2, 'cannot remove someone else from a plan');
reset role;

-- Ben leaves, Ava can't leave, Cy can now join
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select leave_plan((select id from plans limit 1));
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.expect_error($q$select leave_plan((select id from plans limit 1))$q$, 'organizer leaving');
select pg_temp.expect_error($q$insert into plan_members(plan_id,user_id) select id, '00000000-0000-0000-0000-00000000000c' from plans$q$, 'add someone else to a plan (plan has room)');
select pg_temp.check((select count(*) from plan_messages_for((select id from plans limit 1)))=1, 'organizer reads messages');
select pg_temp.expect_error($q$select set_attended((select id from plans limit 1), true)$q$, 'check in before plan starts');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select join_plan((select id from plans limit 1));
select pg_temp.check((select is_member and member_count=2 from plans_feed()), 'Cy joined after Ben left');
select pg_temp.check((select count(*) from profiles)=2, 'Cy sees own + Ava (Ben left plan, now hidden)');
select log_visit(); select log_visit();
select pg_temp.check((select count(*) from app_visits)=1, 'one visit per day');
select report_plan((select id from plans limit 1), 'Testing the report button');
select pg_temp.check((select count(*) from reports)=0, 'reports not readable');
reset role;

-- Time passes: plan is now in the past
update plans set starts_at = now() - interval '3 hours';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select set_attended((select id from plans limit 1), true);
select pg_temp.check((select completed_at is not null from my_list() where name='Wheel pottery'), 'attending marks a first');
select pg_temp.check((select my_attended from plans_feed()), 'attended recorded');
select pg_temp.check((select done=1 and ready=2 from interest_stats() where name='Wheel pottery'), 'stats: 1 done, Ava and Ben still ready');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select pg_temp.expect_error($q$select join_plan((select id from plans limit 1))$q$, 'join a past plan');
select pg_temp.expect_error($q$select set_attended((select id from plans limit 1), true)$q$, 'check in to plan you left');
reset role;

-- Cancelled plans
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select create_plan((select id from interests where name='Birding'), 'Morning bird walk', now() + interval '3 days', 'Nichols Arboretum', null, 6);
select cancel_plan((select max(id) from plans));
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select pg_temp.expect_error($q$select join_plan((select max(id) from plans))$q$, 'join a cancelled plan');
select pg_temp.check((select open_plans from interest_stats() where name='Birding')=0, 'cancelled plan not counted as open');
select remove_from_list((select id from interests where name='Wheel pottery'));
select pg_temp.check((select count(*) from my_list())=0, 'remove from list');
reset role;

-- Hosts: Ben sets up a business profile and lists a hosted experience
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select pg_temp.check((select count(*) from my_host())=0, 'no host profile yet');
select pg_temp.expect_error($q$select create_plan((select id from interests where name='Birding'), 'Hosted walk', now() + interval '2 days', 'Arb', null, 10, true, null)$q$, 'hosted plan without host profile');
select pg_temp.expect_error($q$insert into hosts(id, business_name, verified) values (auth.uid(), 'Self Verified Co', true)$q$, 'set own verified flag on insert');
select pg_temp.expect_error($q$select save_host('x', null, null)$q$, 'too-short business name');
select pg_temp.expect_error($q$select save_host('Ben Birds', 'javascript:alert(1)', null)$q$, 'non-http website');
select save_host('  Ben''s   Birding Co ', 'benbirds.com', 'Guided walks for first-timers');
select pg_temp.check((select business_name='Ben''s Birding Co' and website='https://benbirds.com' and not verified from my_host()), 'host profile saved, normalized, unverified');
select pg_temp.expect_error($q$update hosts set verified = true where id = auth.uid()$q$, 'verify yourself');
select pg_temp.expect_error($q$select create_plan((select id from interests where name='Birding'), 'Huge walk', now() + interval '2 days', 'Arb', null, 201, true, null)$q$, 'hosted capacity over 200');
select pg_temp.expect_error($q$select create_plan((select id from interests where name='Birding'), 'Pricey walk', now() + interval '2 days', 'Arb', null, 20, true, 200000)$q$, 'price over $1000');
select create_plan((select id from interests where name='Birding'), 'Guided beginner bird walk', now() + interval '2 days', 'Nichols Arboretum', null, 100, true, 2500);
select pg_temp.check((select kind='hosted' and member_count=0 and not is_member and price_cents=2500 and host_name='Ben''s Birding Co' and host_website='https://benbirds.com'
  from plans_feed(p_plan_id => (select max(id) from plans))), 'hosted plan: host is not a member, price and host shown');
select pg_temp.expect_error($q$select join_plan((select max(id) from plans))$q$, 'host joins own hosted plan');
select update_plan((select max(id) from plans), 'Guided bird walk', now() + interval '3 days', 'Nichols Arboretum, Geddes entrance', 'Binoculars provided', 50, 2000);
select pg_temp.check((select title='Guided bird walk' and capacity=50 and price_cents=2000 and details='Binoculars provided'
  from plans_feed(p_plan_id => (select max(id) from plans))), 'host edits listing');
select pg_temp.expect_error($q$select update_plan((select max(id) from plans), 'Guided bird walk', now() - interval '1 day', 'Arb', null, 50, null)$q$, 'edit to a past time');
select post_message((select max(id) from plans), 'Meet by the big oak');
select pg_temp.check((select count(*) from plan_messages_for((select max(id) from plans)))=1, 'host (non-member) reads and posts messages');
reset role;

-- Cy: sees hosts, can't edit or verify them, can't post hosted plans, can join
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select pg_temp.check((select count(*) from hosts)=1, 'host profiles are public to members');
update hosts set business_name = 'Hacked';
select pg_temp.check((select business_name from hosts)='Ben''s Birding Co', 'cannot edit someone else host profile');
select pg_temp.expect_error($q$select update_plan((select max(id) from plans), 'Hacked', now() + interval '3 days', 'Arb', null, 50, null)$q$, 'edit someone else plan');
select pg_temp.expect_error($q$insert into plans(interest_id, organizer_id, title, starts_at, location, capacity, kind) values (1, auth.uid(), 'Fake hosted', now() + interval '1 day', 'Arb', 10, 'hosted')$q$, 'insert hosted plan directly without host profile');
select pg_temp.check((select count(*) from plan_messages_for((select max(id) from plans)))=0, 'non-member cannot read hosted messages');
select join_plan((select max(id) from plans));
select pg_temp.check((select member_count=1 and is_member from plans_feed(p_plan_id => (select max(id) from plans))), 'member joins hosted plan');
select pg_temp.check((select count(*) from plan_messages_for((select max(id) from plans)))=1, 'member reads host message');
reset role;

-- Ava: peer plans ignore prices; organizers can edit their own peer plan, not shrink below members
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select create_plan((select id from interests where name='Wheel pottery'), 'Second wheel night', now() + interval '5 days', 'Potters Guild', null, 4, false, 1500);
select pg_temp.check((select kind='peer' and price_cents is null and member_count=1 from plans_feed(p_plan_id => (select max(id) from plans))), 'peer plan has no price, organizer is member');
select pg_temp.expect_error($q$select update_plan((select max(id) from plans), 'Second wheel night', now() + interval '5 days', 'Potters Guild', null, 31, null)$q$, 'peer capacity over 30 on edit');
select update_plan((select max(id) from plans), 'Second wheel night, moved', now() + interval '6 days', 'Potters Guild', null, 3, 999);
select pg_temp.check((select title='Second wheel night, moved' and capacity=3 and price_cents is null from plans_feed(p_plan_id => (select max(id) from plans))), 'peer organizer edits plan; price stays null');
reset role;

-- Signed-out visitors
set role anon;
select pg_temp.expect_error($q$select * from plans$q$, 'anon reads plans');
select pg_temp.expect_error($q$select * from interest_stats()$q$, 'anon calls stats');
select pg_temp.expect_error($q$select * from hosts$q$, 'anon reads hosts');
reset role;
\echo ALL DONE

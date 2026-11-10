# NOVICE MVP

Social discovery app for Ann Arbor: users keep a private Never-Done List, see anonymous counts of who else wants to try each thing, and propose or join small peer-organized plans. Built as a class MVP (Vercel + Supabase) to test one hypothesis: shared interest turns into real participation.

## Stack
- React 19 + TypeScript + Vite + Tailwind v4 (only for the CSS reset; styling is hand-written classes in `src/index.css`, ported from the Figma Make prototype).
- Supabase (Postgres, Auth with email + password, confirm email OFF). Client: `@supabase/supabase-js`.
- Deployed on Vercel; `vercel.json` rewrites all paths to `index.html` for client routing.

## Structure
- `src/lib/api.ts`: the only file that talks to Supabase. Every data call is a Postgres function (RPC) defined in `supabase/schema.sql`.
- `src/lib/store.tsx`: loads profile, interest stats, the user's list, and all plans; `run()` wraps mutations with toast + refresh.
- `src/lib/router.ts`: tiny path router (`/`, `/list`, `/explore`, `/profile`, `/interest/:id`, `/interest/:id/new-plan`, `/plan/:id`, `/plan/:id/edit`, `/host`, `/host/setup`, `/host/new[/:interestId]`).
- `src/screens/*`: one file per screen. `Propose.tsx` holds the shared plan form (propose, host listing, edit); `Host.tsx` holds host setup and dashboard. `src/components/ui.tsx`: shared pieces, including `Photo` (Unsplash photo or lettered fallback).
- `supabase/schema.sql`: tables, row level security, triggers, functions, seed interests. Idempotent.
- `supabase/metrics.sql`: test-result queries. `test/`: in-browser fake API (`mock-api.ts`, used by `vite.config.mock.ts`) and SQL rule tests.

## Rules that matter
- Never-Done Lists are private (owner-only RLS). Others only see totals via `interest_stats()` (security definer, returns counts only).
- A user's first name becomes visible only when they organize or join a plan.
- Two kinds of plans (`plans.kind`): `peer` (a member organizes, free, 2-30, organizer is a member) and `hosted` (a business host lists it, 2-200 spots, host is NOT a member). Hosted prices are display-only, paid at the venue. In-app payments are out of scope.
- Hosts: same login as members, plus a row in `hosts`. Self-serve and live immediately; only the team sets `hosts.verified` (Table Editor). Host dashboard demand uses `interest_stats()` totals only, never who.
- Keep scope small: the MVP exists to measure interest -> committed plan -> attended.

## Commands
- `npm run dev`, `npm run build`, `npm run typecheck`
- `npx vite --config vite.config.mock.ts` to run against fake data.

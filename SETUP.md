# NOVICE MVP: setup and deploy

About 30 minutes, start to finish. You need free accounts on GitHub (you have one), Supabase, and Vercel.

## 1. Install and check the build (your Mac)

In VS Code, open this folder and the terminal (Ctrl + `), then run:

```
npm install
npm run build
```

`npm install` creates `package-lock.json`. Commit it. If the build prints errors, paste them into Claude Code.

## 2. Create the database (Supabase)

1. Go to supabase.com, sign in with GitHub, click **New project**. Name it `novice`, pick a region in the US East, save the database password somewhere.
2. When it's ready, open **SQL Editor**, click **New query**, paste all of `supabase/schema.sql`, and click **Run**. You should see "Success. No rows returned."
3. Open **Authentication > Sign In / Providers > Email** and turn **off** "Confirm email". (The free plan only sends a few emails per hour, so confirmation emails would block testers.)
4. Get your keys: click **Connect** at the top of the project (or **Project Settings > API Keys**). Copy the **Project URL** and the **anon / publishable** key. Never use the `service_role` or secret key in the app.

## 3. Run it on your computer

1. Copy `.env.example` to a new file named `.env.local` and paste in the two values.
2. Run `npm run dev` and open the link it prints (usually http://localhost:5173).
3. Create an account and go through onboarding. In Supabase, **Table Editor > profiles** should now show you.

## 4. Push to GitHub

Commit everything and push to `main` from VS Code's Source Control panel. `.env.local` is ignored on purpose; your keys don't go to GitHub.

The old GitHub Pages workflow has been removed. In your repo's **Settings > Pages**, set the source to **None** so the old prototype link stops showing.

## 5. Deploy (Vercel)

1. Go to vercel.com, sign in with GitHub, click **Add New > Project**, and import `NOVICE_APP`.
2. Vercel detects Vite. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon / publishable key
3. Click **Deploy**. You get a URL like `novice-app.vercel.app`. Every push to `main` redeploys automatically.
4. Back in Supabase, open **Authentication > URL Configuration** and set **Site URL** to that Vercel URL.

## 6. Smoke test before real users

On your phone, sign up as yourself. In a private browser window, sign up as a second test account. Then:

- Account A proposes a plan. Account B finds it from Home or Explore and joins.
- Both post a group message. Account B leaves and rejoins.
- Open the plan link while signed out; after signing in it should open that plan.

Delete the test account afterward in **Authentication > Users**, and add your team's emails to the `team` lists in `supabase/metrics.sql`.

## 7. During the test

- **Cold start:** an empty app gives testers nothing to join. Before inviting people, post 2 or 3 real, low-effort plans for popular interests on dates you'll actually attend, and ask testers to propose their own.
- **Free plan pause:** Supabase pauses free projects after about a week with no activity. If the app stops loading, open the Supabase dashboard and click **Restore**.
- **Password resets:** in **Authentication > Users**, open the user and send a recovery email.
- **Reports:** check `reports` in the Table Editor, or run block 5 of `supabase/metrics.sql`.

## 8. Get your results

Open `supabase/metrics.sql` in the SQL Editor and run one block at a time. Block 1 is your headline number: how many testers committed to a plan with at least one other person, and how many said they actually went.

## Updating the database after code changes

`schema.sql` is safe to re-run on your live project: it upgrades existing tables in place and keeps your data. After pulling changes that touch it (like the host features), open **SQL Editor**, paste all of `supabase/schema.sql`, and click **Run** before (or right after) Vercel deploys the new app.

To give a host the Verified badge: **Table Editor > hosts**, set `verified` to true on their row.

## Testing without Supabase

`npx vite --config vite.config.mock.ts` runs the app against an in-browser fake database with sample people and plans. Sign in as `dee@x.edu` / `secret1` to see the host side (Ava, Ben, and Cy are regular members, same password). If you used the mock before, run `__mock.reset()` in the browser console to load the new sample data. Use it to try UI changes safely. `test/rls_test.sql` contains the database rule tests.

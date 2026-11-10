// In-browser fake of src/lib/api.ts for local testing without Supabase.
// Mirrors the database rules in supabase/schema.sql closely enough to click through every flow.
import type {
  InterestStat,
  Intent,
  ListItem,
  Message,
  NewPlan,
  Plan,
  Profile,
  Session,
} from "../src/lib/types";

export const isConfigured = true;
export function friendlyError(m: string) {
  return m;
}

type Db = {
  users: { id: string; email: string; password: string; name: string; onboarded: boolean; hood: string | null }[];
  interests: { id: number; name: string; category: string; suggested: boolean }[];
  items: { user: string; interest: number; intent: Intent; completed_at: string | null; created_at: string }[];
  plans: {
    id: number; interest: number; organizer: string; title: string; starts_at: string;
    location: string; details: string | null; capacity: number; status: "open" | "cancelled";
  }[];
  members: { plan: number; user: string; joined_at: string; attended: boolean | null }[];
  messages: Message[];
  reports: { plan: number; reason: string }[];
  session: string | null;
  seq: number;
};

const KEY = "novice-mock-db";
const suggested: [string, string][] = [
  ["Wheel pottery", "Make"], ["Urban foraging", "Outdoors"], ["Partner dancing", "Move"],
  ["Film photography", "Make"], ["Kayaking", "Outdoors"], ["Sourdough baking", "Cook"],
  ["Birding", "Outdoors"], ["Improv comedy", "Perform"], ["Sewing a garment", "Make"],
  ["Bouldering", "Move"], ["Watercolor painting", "Make"], ["Pickleball", "Move"],
  ["Mushroom growing", "Grow"], ["Pasta from scratch", "Cook"], ["Open-water swimming", "Move"],
  ["Woodworking", "Make"], ["Stargazing", "Outdoors"], ["DJ basics", "Perform"],
  ["Community gardening", "Grow"], ["Screen printing", "Make"], ["Stand-up comedy", "Perform"],
  ["Trail running", "Move"],
];

function seed(): Db {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const db: Db = {
    users: [
      { id: "u-ava", email: "ava@x.edu", password: "secret1", name: "Ava", onboarded: true, hood: null },
      { id: "u-ben", email: "ben@x.edu", password: "secret1", name: "Ben", onboarded: true, hood: null },
      { id: "u-cy", email: "cy@x.edu", password: "secret1", name: "Cy", onboarded: true, hood: null },
    ],
    interests: suggested.map(([name, category], i) => ({ id: i + 1, name, category, suggested: true })),
    items: [],
    plans: [],
    members: [],
    messages: [],
    reports: [],
    session: null,
    seq: 100,
  };
  const add = (user: string, interest: number, intent: Intent) =>
    db.items.push({ user, interest, intent, completed_at: null, created_at: iso(now) });
  add("u-ava", 1, "ready"); add("u-ben", 1, "join"); add("u-cy", 1, "curious");
  add("u-ava", 7, "ready"); add("u-ben", 10, "ready"); add("u-cy", 10, "join");
  db.plans.push({
    id: 1, interest: 1, organizer: "u-ava", title: "First turn on the wheel",
    starts_at: iso(now + 3 * 86400000), location: "Ann Arbor Potters Guild",
    details: "Drop-in session is $20. I'll be by the front desk.", capacity: 4, status: "open",
  });
  db.members.push({ plan: 1, user: "u-ava", joined_at: iso(now), attended: null });
  db.members.push({ plan: 1, user: "u-ben", joined_at: iso(now), attended: null });
  db.plans.push({
    id: 2, interest: 10, organizer: "u-ben", title: "Beginner night at the climbing gym",
    starts_at: iso(now + 5 * 86400000), location: "Planet Rock Ann Arbor",
    details: null, capacity: 2, status: "open",
  });
  db.members.push({ plan: 2, user: "u-ben", joined_at: iso(now), attended: null });
  db.members.push({ plan: 2, user: "u-cy", joined_at: iso(now), attended: null });
  return db;
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* ignore */
  }
  return seed();
}
let db = load();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

const listeners = new Set<(s: Session | null) => void>();
const wait = () => new Promise((r) => setTimeout(r, 60));
function me() {
  const u = db.users.find((x) => x.id === db.session);
  if (!u) throw new Error("Your session expired. Please sign in again.");
  return u;
}
function sessionOf(): Session | null {
  const u = db.users.find((x) => x.id === db.session);
  return u ? { userId: u.id, email: u.email } : null;
}
function emit() {
  save();
  const s = sessionOf();
  listeners.forEach((l) => l(s));
}

// Test hooks for Playwright.
(window as unknown as { __mock: unknown }).__mock = {
  reset() {
    db = seed();
    save();
  },
  makePast(planId: number) {
    const p = db.plans.find((x) => x.id === planId);
    if (p) p.starts_at = new Date(Date.now() - 3600000).toISOString();
    save();
  },
  db: () => db,
};

// ---------- Auth ----------
export async function getSession() {
  await wait();
  return sessionOf();
}
export function onAuthChange(cb: (s: Session | null) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export async function signUp(email: string, password: string, displayName: string) {
  await wait();
  if (db.users.some((u) => u.email === email.toLowerCase()))
    throw new Error("There's already an account with that email. Try signing in.");
  const id = `u-${db.seq++}`;
  db.users.push({ id, email: email.toLowerCase(), password, name: displayName, onboarded: false, hood: null });
  db.session = id;
  emit();
  return { needsConfirmation: false };
}
export async function signIn(email: string, password: string) {
  await wait();
  const u = db.users.find((x) => x.email === email.toLowerCase() && x.password === password);
  if (!u) throw new Error("That email and password don't match.");
  db.session = u.id;
  emit();
}
export async function signOut() {
  db.session = null;
  emit();
}

// ---------- Profile ----------
export async function myProfile(): Promise<Profile | null> {
  await wait();
  const u = me();
  return { id: u.id, display_name: u.name, neighborhood: u.hood, onboarded: u.onboarded };
}
export async function updateProfile(name: string, hood: string) {
  await wait();
  const u = me();
  u.name = name;
  u.hood = hood || null;
  save();
}
export async function finishOnboarding() {
  me().onboarded = true;
  save();
}
export async function logVisit() {}

// ---------- Interests ----------
function openPlans(interest: number) {
  return db.plans.filter(
    (p) => p.interest === interest && p.status === "open" && new Date(p.starts_at).getTime() > Date.now(),
  ).length;
}
export async function interestStats(): Promise<InterestStat[]> {
  await wait();
  return db.interests
    .filter((i) => i.suggested || db.items.some((x) => x.interest === i.id) || db.plans.some((p) => p.interest === i.id))
    .map((i) => {
      const items = db.items.filter((x) => x.interest === i.id);
      const active = items.filter((x) => !x.completed_at);
      return {
        interest_id: i.id, name: i.name, category: i.category, is_suggested: i.suggested,
        listed: active.length,
        want_join: active.filter((x) => x.intent !== "curious").length,
        ready: active.filter((x) => x.intent === "ready").length,
        done: items.filter((x) => x.completed_at).length,
        open_plans: openPlans(i.id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
export async function myList(): Promise<ListItem[]> {
  await wait();
  const u = me();
  return db.items
    .filter((x) => x.user === u.id)
    .map((x) => {
      const i = db.interests.find((y) => y.id === x.interest)!;
      return { interest_id: i.id, name: i.name, category: i.category, intent: x.intent, completed_at: x.completed_at, created_at: x.created_at };
    })
    .reverse();
}
function upsertItem(user: string, interest: number, intent?: Intent, completed?: string | null) {
  let it = db.items.find((x) => x.user === user && x.interest === interest);
  if (!it) {
    it = { user, interest, intent: intent ?? "curious", completed_at: null, created_at: new Date().toISOString() };
    db.items.push(it);
  } else if (intent) it.intent = intent;
  if (completed !== undefined) it.completed_at = completed;
  return it;
}
export async function addToList(interestId: number, intent: Intent = "curious") {
  await wait();
  upsertItem(me().id, interestId, intent, null);
  save();
}
export async function addCustomInterest(name: string) {
  await wait();
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 60) throw new Error("Use 2 to 60 characters.");
  let i = db.interests.find((x) => x.name.toLowerCase() === clean.toLowerCase());
  if (!i) {
    i = { id: db.seq++, name: clean, category: "Other", suggested: false };
    db.interests.push(i);
  }
  upsertItem(me().id, i.id, undefined, null);
  save();
  return i.id;
}
export async function setIntent(interestId: number, intent: Intent) {
  await wait();
  upsertItem(me().id, interestId, intent);
  save();
}
export async function removeFromList(interestId: number) {
  await wait();
  const u = me();
  db.items = db.items.filter((x) => !(x.user === u.id && x.interest === interestId));
  save();
}
export async function markDone(interestId: number, done: boolean) {
  await wait();
  const it = db.items.find((x) => x.user === me().id && x.interest === interestId);
  if (it) it.completed_at = done ? new Date().toISOString() : null;
  save();
}

// ---------- Plans ----------
export async function allPlans(): Promise<Plan[]> {
  await wait();
  const u = me();
  return db.plans
    .map((p) => {
      const i = db.interests.find((x) => x.id === p.interest)!;
      const ms = db.members.filter((m) => m.plan === p.id);
      const mine = ms.find((m) => m.user === u.id);
      return {
        id: p.id, interest_id: i.id, interest_name: i.name, category: i.category,
        title: p.title, starts_at: p.starts_at, location: p.location, details: p.details,
        capacity: p.capacity, status: p.status, organizer_id: p.organizer,
        organizer_name: db.users.find((x) => x.id === p.organizer)?.name ?? null,
        member_count: ms.length,
        members: ms.map((m) => ({ user_id: m.user, name: db.users.find((x) => x.id === m.user)?.name ?? null })),
        is_member: Boolean(mine), my_attended: mine ? mine.attended : null,
      };
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
export async function createPlan(p: NewPlan) {
  await wait();
  const u = me();
  if (new Date(p.startsAt).getTime() <= Date.now()) throw new Error("Choose a time in the future.");
  const id = db.seq++;
  db.plans.push({
    id, interest: p.interestId, organizer: u.id, title: p.title, starts_at: p.startsAt,
    location: p.location, details: p.details || null, capacity: p.capacity, status: "open",
  });
  db.members.push({ plan: id, user: u.id, joined_at: new Date().toISOString(), attended: null });
  upsertItem(u.id, p.interestId, "ready");
  save();
  return id;
}
export async function joinPlan(planId: number) {
  await wait();
  const u = me();
  const p = db.plans.find((x) => x.id === planId);
  if (!p) throw new Error("This plan no longer exists.");
  if (p.status !== "open") throw new Error("This plan was cancelled.");
  if (new Date(p.starts_at).getTime() <= Date.now()) throw new Error("This plan has already started.");
  if (db.members.some((m) => m.plan === planId && m.user === u.id)) return;
  if (db.members.filter((m) => m.plan === planId).length >= p.capacity) throw new Error("This plan is full.");
  db.members.push({ plan: planId, user: u.id, joined_at: new Date().toISOString(), attended: null });
  const it = db.items.find((x) => x.user === u.id && x.interest === p.interest);
  if (!it) upsertItem(u.id, p.interest, "ready");
  else if (!it.completed_at) it.intent = "ready";
  save();
}
export async function leavePlan(planId: number) {
  await wait();
  const u = me();
  if (db.plans.some((p) => p.id === planId && p.organizer === u.id))
    throw new Error("Organizers can cancel the plan instead of leaving it.");
  db.members = db.members.filter((m) => !(m.plan === planId && m.user === u.id));
  save();
}
export async function cancelPlan(planId: number) {
  await wait();
  const p = db.plans.find((x) => x.id === planId && x.organizer === me().id);
  if (!p) throw new Error("Only the organizer can cancel this plan.");
  p.status = "cancelled";
  save();
}
export async function setAttended(planId: number, attended: boolean) {
  await wait();
  const u = me();
  const p = db.plans.find((x) => x.id === planId)!;
  if (new Date(p.starts_at).getTime() > Date.now()) throw new Error("You can check in after the plan starts.");
  const m = db.members.find((x) => x.plan === planId && x.user === u.id);
  if (!m) throw new Error("You are not part of this plan.");
  m.attended = attended;
  if (attended) {
    const it = upsertItem(u.id, p.interest, "ready");
    it.completed_at = it.completed_at ?? new Date().toISOString();
  }
  save();
}
export async function planMessages(planId: number) {
  await wait();
  const u = me();
  if (!db.members.some((m) => m.plan === planId && m.user === u.id)) return [];
  return db.messages.filter((m) => (m as Message & { plan?: number }).plan === planId);
}
export async function postMessage(planId: number, body: string) {
  await wait();
  const u = me();
  if (!db.members.some((m) => m.plan === planId && m.user === u.id))
    throw new Error("You don't have permission to do that.");
  db.messages.push({ id: db.seq++, user_id: u.id, name: u.name, body, created_at: new Date().toISOString(), plan: planId } as Message);
  save();
}
export async function reportPlan(planId: number, reason: string) {
  await wait();
  db.reports.push({ plan: planId, reason });
  save();
}

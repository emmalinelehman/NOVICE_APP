// All communication with Supabase lives in this file. Screens only call these functions.
import { createClient, type Session as SupabaseSession } from "@supabase/supabase-js";
import type {
  InterestStat,
  Intent,
  ListItem,
  Message,
  NewPlan,
  Plan,
  Profile,
  Session,
} from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && anonKey);

const supabase = isConfigured ? createClient(url!, anonKey!) : null;

function client() {
  if (!supabase) throw new Error("NOVICE isn't connected to its database yet.");
  return supabase;
}

// Turn database and network errors into sentences a tester can act on.
export function friendlyError(message: string): string {
  const m = message || "";
  if (/failed to fetch|networkerror|load failed/i.test(m))
    return "Can't reach NOVICE right now. Check your connection and try again.";
  if (/jwt expired|invalid jwt|not authenticated/i.test(m))
    return "Your session expired. Please sign in again.";
  if (/invalid login credentials/i.test(m)) return "That email and password don't match.";
  if (/already registered|already exists/i.test(m))
    return "There's already an account with that email. Try signing in.";
  if (/password should be at least/i.test(m)) return "Use a password with at least 6 characters.";
  if (/email not confirmed/i.test(m)) return "Confirm your email first, then sign in.";
  if (/rate limit/i.test(m)) return "Too many tries in a row. Wait a minute and try again.";
  if (/plans_title_check/.test(m)) return "Plan titles need 4 to 80 characters.";
  if (/plans_location_check/.test(m)) return "Add a meeting place (up to 120 characters).";
  if (/plans_details_check/.test(m)) return "Keep details under 500 characters.";
  if (/plans_capacity_check/.test(m)) return "Group size must be between 2 and 30.";
  if (/plan_messages_body_check/.test(m)) return "Messages need 1 to 500 characters.";
  if (/row-level security|permission denied/i.test(m))
    return "You don't have permission to do that.";
  // Messages raised by our own database functions are already written for people.
  if (/^[A-Z][^{}]*[.!]$/.test(m.trim()) && m.length < 140) return m.trim();
  return "Something went wrong. Please try again.";
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().rpc(fn, args);
  if (error) throw new Error(friendlyError(error.message));
  return data as T;
}

function toSession(s: SupabaseSession | null): Session | null {
  return s ? { userId: s.user.id, email: s.user.email ?? "" } : null;
}

// ---------- Auth ----------
export async function getSession(): Promise<Session | null> {
  const { data } = await client().auth.getSession();
  return toSession(data.session);
}

export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const { data } = client().auth.onAuthStateChange((_event: string, s: SupabaseSession | null) =>
    callback(toSession(s)),
  );
  return () => data.subscription.unsubscribe();
}

export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw new Error(friendlyError(error.message));
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyError(error.message));
}

export async function signOut() {
  await client().auth.signOut();
}

// ---------- Profile ----------
export async function myProfile(): Promise<Profile | null> {
  const rows = await rpc<Profile[]>("my_profile");
  return rows[0] ?? null;
}
export const updateProfile = (displayName: string, neighborhood: string) =>
  rpc<void>("update_profile", { p_display_name: displayName, p_neighborhood: neighborhood });
export const finishOnboarding = () => rpc<void>("finish_onboarding");
export const logVisit = () => rpc<void>("log_visit");

// ---------- Interests and lists ----------
export const interestStats = () => rpc<InterestStat[]>("interest_stats");
export const myList = () => rpc<ListItem[]>("my_list");
export const addToList = (interestId: number, intent: Intent = "curious") =>
  rpc<void>("add_to_list", { p_interest_id: interestId, p_intent: intent });
export const addCustomInterest = (name: string) =>
  rpc<number>("add_custom_interest", { p_name: name });
export const setIntent = (interestId: number, intent: Intent) =>
  rpc<void>("set_intent", { p_interest_id: interestId, p_intent: intent });
export const removeFromList = (interestId: number) =>
  rpc<void>("remove_from_list", { p_interest_id: interestId });
export const markDone = (interestId: number, done: boolean) =>
  rpc<void>("mark_done", { p_interest_id: interestId, p_done: done });

// ---------- Plans ----------
export const allPlans = () => rpc<Plan[]>("plans_feed");
export const createPlan = (p: NewPlan) =>
  rpc<number>("create_plan", {
    p_interest_id: p.interestId,
    p_title: p.title,
    p_starts_at: p.startsAt,
    p_location: p.location,
    p_details: p.details,
    p_capacity: p.capacity,
  });
export const joinPlan = (planId: number) => rpc<void>("join_plan", { p_plan_id: planId });
export const leavePlan = (planId: number) => rpc<void>("leave_plan", { p_plan_id: planId });
export const cancelPlan = (planId: number) => rpc<void>("cancel_plan", { p_plan_id: planId });
export const setAttended = (planId: number, attended: boolean) =>
  rpc<void>("set_attended", { p_plan_id: planId, p_attended: attended });
export const planMessages = (planId: number) =>
  rpc<Message[]>("plan_messages_for", { p_plan_id: planId });
export const postMessage = (planId: number, body: string) =>
  rpc<void>("post_message", { p_plan_id: planId, p_body: body });
export const reportPlan = (planId: number, reason: string) =>
  rpc<void>("report_plan", { p_plan_id: planId, p_reason: reason });

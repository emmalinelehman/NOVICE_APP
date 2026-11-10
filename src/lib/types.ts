export type Intent = "curious" | "join" | "ready";

export type Session = { userId: string; email: string };

export type Profile = {
  id: string;
  display_name: string;
  neighborhood: string | null;
  onboarded: boolean;
};

export type InterestStat = {
  interest_id: number;
  name: string;
  category: string;
  is_suggested: boolean;
  listed: number;
  want_join: number;
  ready: number;
  done: number;
  open_plans: number;
};

export type ListItem = {
  interest_id: number;
  name: string;
  category: string;
  intent: Intent;
  completed_at: string | null;
  created_at: string;
};

export type Member = { user_id: string; name: string | null };

export type Plan = {
  id: number;
  interest_id: number;
  interest_name: string;
  category: string;
  title: string;
  starts_at: string;
  location: string;
  details: string | null;
  capacity: number;
  status: "open" | "cancelled";
  organizer_id: string;
  organizer_name: string | null;
  member_count: number;
  members: Member[];
  is_member: boolean;
  my_attended: boolean | null;
  /** peer = organized by a member; hosted = listed by a business host. */
  kind: PlanKind;
  /** Hosted only. Paid at the venue, never through NOVICE. null = free. */
  price_cents: number | null;
  host_name: string | null;
  host_verified: boolean;
  host_website: string | null;
};

export type PlanKind = "peer" | "hosted";

export type Host = {
  id: string;
  business_name: string;
  website: string | null;
  about: string | null;
  verified: boolean;
};

export type HostInput = { businessName: string; website: string; about: string };

export type Message = {
  id: number;
  user_id: string;
  name: string | null;
  body: string;
  created_at: string;
};

export type NewPlan = {
  interestId: number;
  title: string;
  startsAt: string; // ISO timestamp
  location: string;
  details: string;
  capacity: number;
  /** Create as a hosted experience (requires a host profile). */
  asHost?: boolean;
  priceCents?: number | null;
};

export type PlanEdit = Omit<NewPlan, "interestId" | "asHost">;

export const intentCopy: Record<Intent, { label: string; desc: string }> = {
  curious: { label: "Curious", desc: "I'm exploring the idea" },
  join: { label: "Want to join", desc: "Invite me if there's a plan" },
  ready: { label: "Ready to plan", desc: "I'd go in the next few weeks" },
};

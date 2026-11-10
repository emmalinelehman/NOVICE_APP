import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Flag,
  Link2,
  MapPin,
  Minus,
  Plus,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import { goBack, navigate } from "@/lib/router";
import { formatDate, formatTime, initials, isPast, longDay, relativeDay } from "@/lib/format";
import type { Message, Plan } from "@/lib/types";
import { Back, Badge, Button, Empty, ErrorBanner, Photo } from "@/components/ui";

export function PlanPage({ id }: { id: number }) {
  const { plans, session } = useStore();
  const plan = plans.find((p) => p.id === id);

  if (!plan) {
    return (
      <div className="page">
        <Back onClick={() => goBack("/")} label="Back" />
        <Empty
          title="We couldn't find that plan."
          text="It may have been removed. Check your home screen for plans you can join."
          action={<Button onClick={() => navigate("/")}>Go home</Button>}
        />
      </div>
    );
  }

  const isOrganizer = plan.organizer_id === session.userId;
  const spots = plan.capacity - plan.member_count;
  const cancelled = plan.status === "cancelled";

  return (
    <div className="page">
      <Back onClick={() => goBack(`/interest/${plan.interest_id}`)} label={plan.interest_name} />
      <Photo name={plan.interest_name} className="plan-cover" />
      <div className="plan-detail">
        <section>
          <div className="plan-label">
            <Badge tone="sage">
              <Users size={13} /> Peer-organized
            </Badge>
            {cancelled && <Badge tone="rust">Cancelled</Badge>}
          </div>
          <p className="plan-type-help">
            A NOVICE member made this plan. Nobody is an expert. Everyone learns alongside each
            other.
          </p>
          <h1>{plan.title}</h1>
          <div className="detail-list">
            <div>
              <CalendarDays />
              <span>
                <small>Date</small>
                <strong>{longDay(plan.starts_at)}</strong>
              </span>
            </div>
            <div>
              <Clock3 />
              <span>
                <small>Time</small>
                <strong>{formatTime(plan.starts_at)}</strong>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <small>Meet at</small>
                <strong>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${plan.location}, Ann Arbor, MI`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {plan.location}
                  </a>
                </strong>
              </span>
            </div>
            <div>
              <Users />
              <span>
                <small>Group</small>
                <strong>
                  {plan.member_count} going &middot; {spots > 0 ? `${spots} spot${spots > 1 ? "s" : ""} left` : "full"}
                </strong>
              </span>
            </div>
          </div>

          <div className="booking-card only-mobile">
            <PlanActions plan={plan} />
          </div>

          {plan.details && (
            <div className="organizer-note">
              <p className="eyebrow">From the organizer</p>
              <p>{plan.details}</p>
            </div>
          )}

          <div className="organizer">
            <span>{initials(plan.organizer_name)}</span>
            <div>
              <small>Organized by</small>
              <strong>{isOrganizer ? "You" : plan.organizer_name}</strong>
            </div>
          </div>

          <div className="participants">
            <p className="eyebrow">Who&rsquo;s going</p>
            <div>
              {plan.members.map((m, i) => (
                <span key={m.user_id} style={{ zIndex: 30 - i }} title={m.name ?? undefined}>
                  {initials(m.name)}
                </span>
              ))}
            </div>
            <small>
              {plan.members
                .map((m) => (m.user_id === session.userId ? "You" : m.name))
                .filter(Boolean)
                .join(", ")}
            </small>
          </div>

          {plan.is_member && <Messages planId={plan.id} myId={session.userId} />}

          <SafetyAndReport plan={plan} />
        </section>

        <aside className="booking-card only-desktop">
          <PlanActions plan={plan} />
        </aside>
      </div>
    </div>
  );
}

function PlanActions({ plan }: { plan: Plan }) {
  const { session, run, notify } = useStore();
  const isOrganizer = plan.organizer_id === session.userId;
  const spots = plan.capacity - plan.member_count;
  const past = isPast(plan.starts_at);
  const cancelled = plan.status === "cancelled";

  const share = async () => {
    const url = `${window.location.origin}/plan/${plan.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: plan.title, text: `Join me on NOVICE: ${plan.title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify("Link copied. Send it to anyone who might want to come.");
    } catch (e) {
      // Share sheet dismissed: do nothing. Clipboard blocked: show the link instead.
      if ((e as Error).name !== "AbortError") notify(`Copy this link: ${url}`);
    }
  };

  return (
    <>
      <div className="price">
        <strong>{cancelled ? "Cancelled" : past ? "This plan happened" : "Free to join"}</strong>
        <span>
          {cancelled
            ? "The organizer called this one off."
            : past
              ? formatDate(plan.starts_at)
              : "Any costs are listed in the organizer's details"}
        </span>
      </div>

      {!cancelled && !past && (
        <>
          <div className="booking-note">
            <ShieldCheck size={18} />
            <p>
              <strong>Beginners belong here.</strong>
              <br />
              Joining shows your first name to the group.
            </p>
          </div>
          {plan.is_member ? (
            isOrganizer ? (
              <OrganizerActions plan={plan} />
            ) : (
              <Button
                variant="secondary"
                onClick={() => run(() => api.leavePlan(plan.id), "You left the plan")}
              >
                <Minus size={17} /> Leave this plan
              </Button>
            )
          ) : spots > 0 ? (
            <Button onClick={() => run(() => api.joinPlan(plan.id), "You're in. See you there.")}>
              <Plus size={17} /> Join this plan
            </Button>
          ) : (
            <Button disabled>This plan is full</Button>
          )}
          <small>
            {plan.is_member
              ? isOrganizer
                ? "You're the organizer. Share the link to fill spots."
                : "You're on the list. Messages from the group are below."
              : `${spots} of ${plan.capacity} spots open`}
          </small>
          <Button variant="text" onClick={share} className="share-btn">
            <Link2 size={17} /> Share this plan
          </Button>
        </>
      )}

      {past && !cancelled && plan.is_member && (
        <div className="checkin compact">
          {plan.my_attended === null ? (
            <>
              <p>
                <strong>Did you go?</strong>
              </p>
              <Button onClick={() => run(() => api.setAttended(plan.id, true), "Nice. Added to your Firsts.")}>
                <Check size={17} /> Yes, I went
              </Button>
              <Button
                variant="secondary"
                onClick={() => run(() => api.setAttended(plan.id, false), "Thanks for letting us know.")}
              >
                <X size={17} /> I didn&rsquo;t go
              </Button>
            </>
          ) : (
            <p>
              {plan.my_attended
                ? "You went. It's in your Firsts."
                : "You told us you didn't make it."}{" "}
              <button
                className="linkish"
                onClick={() => run(() => api.setAttended(plan.id, !plan.my_attended))}
              >
                Change answer
              </button>
            </p>
          )}
        </div>
      )}
    </>
  );
}

function OrganizerActions({ plan }: { plan: Plan }) {
  const { run } = useStore();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        <X size={17} /> Cancel this plan
      </Button>
    );
  }
  return (
    <div className="confirm-box">
      <p>Cancel &ldquo;{plan.title}&rdquo; for everyone? This can&rsquo;t be undone.</p>
      <div>
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          Keep it
        </Button>
        <Button onClick={() => run(() => api.cancelPlan(plan.id), "Plan cancelled")}>Yes, cancel</Button>
      </div>
    </div>
  );
}

function Messages({ planId, myId }: { planId: number; myId: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMessages(await api.planMessages(planId));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [planId]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 20000);
    return () => window.clearInterval(t);
  }, [load]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      await api.postMessage(planId, body);
      setDraft("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="messages" aria-label="Group messages">
      <p className="eyebrow">Group messages</p>
      <p className="messages-help">
        Only people in this plan can see these. Use them to find each other on the day.
      </p>
      {error && <ErrorBanner message={error} onRetry={load} />}
      {messages === null ? (
        <p className="muted">Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="muted">No messages yet. Say hi, or share how people will find you.</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m.id} className={m.user_id === myId ? "mine" : ""}>
              <strong>{m.user_id === myId ? "You" : m.name}</strong>
              <time dateTime={m.created_at}>
                {relativeDay(m.created_at)} {formatTime(m.created_at)}
              </time>
              <p>{m.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={send} className="message-form">
        <input
          value={draft}
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write to the group"
          aria-label="Write to the group"
        />
        <Button type="submit" disabled={!draft.trim()} busy={busy}>
          <Send size={16} /> Send
        </Button>
      </form>
    </section>
  );
}

function SafetyAndReport({ plan }: { plan: Plan }) {
  const { run } = useStore();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <section className="safety-note">
      <p className="eyebrow">Meeting new people safely</p>
      <ul>
        <li>Meet in a public place, and tell a friend where you&rsquo;re going.</li>
        <li>NOVICE doesn&rsquo;t supervise plans. Organizers are fellow members, not instructors.</li>
        <li>Leave anytime if something feels off.</li>
      </ul>
      {sent ? (
        <p className="muted">Thanks. The NOVICE team will review your report.</p>
      ) : open ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (reason.trim().length < 3) return;
            const ok = await run(() => api.reportPlan(plan.id, reason.trim()), "Report sent");
            if (ok) setSent(true);
          }}
          className="report-form"
        >
          <label htmlFor="report-reason">What&rsquo;s wrong with this plan?</label>
          <textarea
            id="report-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div>
            <Button variant="text" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" disabled={reason.trim().length < 3}>
              Send report
            </Button>
          </div>
        </form>
      ) : (
        <button className="linkish" onClick={() => setOpen(true)}>
          <Flag size={14} /> Report this plan
        </button>
      )}
    </section>
  );
}

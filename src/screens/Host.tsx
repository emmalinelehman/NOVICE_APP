import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, BadgeCheck, Pencil, Plus, Store } from "lucide-react";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import { goBack, navigate } from "@/lib/router";
import { formatPrice, formatTime, isPast, relativeDay } from "@/lib/format";
import type { InterestStat, Plan } from "@/lib/types";
import { Back, Badge, Button, Empty, ErrorBanner, Field, Photo } from "@/components/ui";

const categories = ["All", "Make", "Move", "Outdoors", "Cook", "Grow", "Perform", "Other"];

// ---------------------------------------------------------------------------
// Setup: create or edit the business profile. Self-serve, so it goes live on save.
// ---------------------------------------------------------------------------
export function HostSetup() {
  const { host, refresh, notify } = useStore();
  const [form, setForm] = useState({
    businessName: host?.business_name ?? "",
    website: host?.website ?? "",
    about: host?.about ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (host)
      setForm({ businessName: host.business_name, website: host.website ?? "", about: host.about ?? "" });
  }, [host]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");
    const next: Record<string, string> = {};
    const name = form.businessName.trim();
    if (name.length < 2 || name.length > 80) next.businessName = "Use 2 to 80 characters.";
    if (form.about.trim().length > 400) next.about = "Keep it under 400 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api.saveHost({ businessName: name, website: form.website.trim(), about: form.about.trim() });
      await refresh();
      notify(host ? "Host profile saved" : "You're set up as a host");
      navigate("/host", { replace: !host });
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <Back onClick={() => goBack(host ? "/host" : "/profile")} label={host ? "Host dashboard" : "Profile"} />
      <div className="page-heading">
        <p className="eyebrow">{host ? "Your business" : "For studios, gyms, and venues"}</p>
        <h1>{host ? "Host profile" : "Host on NOVICE"}</h1>
        {!host && (
          <p className="lede">
            List classes, workshops, and drop-in nights for people trying something for the first
            time. You&rsquo;ll see anonymous totals of how many people in Ann Arbor want to try what
            you teach. Nobody&rsquo;s private list is ever shown to you.
          </p>
        )}
      </div>

      {!host && (
        <ol className="how-list">
          <li>
            <strong>Set up your profile.</strong>
            <span>Your business name is shown on every experience you list.</span>
          </li>
          <li>
            <strong>List an experience.</strong>
            <span>
              A time, an address, how many spots, and a price if there is one. People pay you at the
              door. NOVICE never handles money.
            </span>
          </li>
          <li>
            <strong>See who&rsquo;s coming.</strong>
            <span>
              Your dashboard shows sign-ups by first name and what beginners nearby want to try next.
            </span>
          </li>
        </ol>
      )}

      <form className="plan-form" onSubmit={submit} noValidate>
        <Field label="Business name" error={errors.businessName} hint="As customers know it.">
          <input
            value={form.businessName}
            maxLength={80}
            onChange={(e) => setForm((x) => ({ ...x, businessName: e.target.value }))}
            placeholder="e.g. Kerrytown Clay Studio"
          />
        </Field>
        <Field label="Website (optional)" hint="Helps people check you out before signing up.">
          <input
            value={form.website}
            maxLength={200}
            inputMode="url"
            onChange={(e) => setForm((x) => ({ ...x, website: e.target.value }))}
            placeholder="e.g. kerrytownclay.com"
          />
        </Field>
        <Field
          label="About (optional)"
          error={errors.about}
          hint="One or two sentences. What you do, and why beginners are welcome."
        >
          <textarea
            value={form.about}
            maxLength={400}
            rows={3}
            onChange={(e) => setForm((x) => ({ ...x, about: e.target.value }))}
          />
        </Field>
        {serverError && <ErrorBanner message={serverError} />}
        <p className="muted small-print">
          By hosting, you agree to list real, beginner-friendly experiences at the time and place
          shown. Members can report listings, and the NOVICE team removes ones that break this.
        </p>
        <div className="form-actions">
          <Button variant="text" onClick={() => goBack(host ? "/host" : "/profile")}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            {host ? "Save changes" : "Start hosting"} <ArrowRight size={17} />
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard: listings with sign-ups, and anonymous demand for what to list next.
// ---------------------------------------------------------------------------
export function HostDashboard() {
  const { host, plans, session, stats } = useStore();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const mine = useMemo(
    () => plans.filter((p) => p.kind === "hosted" && p.organizer_id === session.userId),
    [plans, session.userId],
  );
  const upcoming = mine.filter((p) => p.status === "open" && !isPast(p.starts_at));
  const past = mine
    .filter((p) => p.status === "cancelled" || isPast(p.starts_at))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  if (!host) {
    return (
      <div className="page narrow">
        <Empty
          title="You're not set up as a host yet."
          text="Studios, gyms, and venues can list beginner-friendly experiences on NOVICE."
          action={<Button onClick={() => navigate("/host/setup", { replace: true })}>Set up hosting</Button>}
        />
      </div>
    );
  }

  const spots = upcoming.reduce((n, p) => n + p.capacity, 0);
  const signups = upcoming.reduce((n, p) => n + p.member_count, 0);
  const fill = spots ? Math.round((100 * signups) / spots) : 0;
  const pastSignups = past.filter((p) => p.status === "open").reduce((n, p) => n + p.member_count, 0);
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="page">
      <div className="host-heading">
        <div>
          <p className="eyebrow">
            {host.business_name}
            {host.verified && (
              <span className="verified">
                <BadgeCheck size={14} /> Verified
              </span>
            )}
          </p>
          <h1>Host dashboard</h1>
        </div>
        <Button onClick={() => navigate("/host/new")}>
          <Plus size={17} /> List an experience
        </Button>
      </div>

      <section className="demand-layout">
        <Demand stats={stats} />
        <aside className="host-summary" aria-label="Your numbers">
          <p className="eyebrow">Upcoming</p>
          <div>
            <strong>{signups}</strong>
            <span>
              {signups === 1 ? "person has" : "people have"} signed up for {upcoming.length}{" "}
              {upcoming.length === 1 ? "experience" : "experiences"}
            </span>
          </div>
          <dl>
            <dt>Spots filled</dt>
            <dd>{spots ? `${fill}%` : "None listed"}</dd>
            <dt>Open spots</dt>
            <dd>{spots - signups}</dd>
            <dt>Past sign-ups</dt>
            <dd>{pastSignups}</dd>
          </dl>
          <button className="setting-link" onClick={() => navigate("/host/setup")}>
            Edit host profile <Pencil size={15} />
          </button>
          {!host.verified && (
            <p className="muted small-print">
              The NOVICE team adds a Verified badge after confirming a business is real.
            </p>
          )}
        </aside>
      </section>

      <section className="home-section host-workshops">
        <div className="home-section-title">
          <div>
            <p className="eyebrow">Your listings</p>
            <h2>Experiences</h2>
          </div>
        </div>
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "upcoming"}
            className={tab === "upcoming" ? "active" : ""}
            onClick={() => setTab("upcoming")}
          >
            Upcoming <span>{upcoming.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "past"}
            className={tab === "past" ? "active" : ""}
            onClick={() => setTab("past")}
          >
            Past and cancelled <span>{past.length}</span>
          </button>
        </div>
        {shown.length ? (
          shown.map((p) => <Listing key={p.id} plan={p} />)
        ) : tab === "upcoming" ? (
          <Empty
            title="Nothing listed yet."
            text="Start with whatever beginners nearby are asking for. The demand panel above shows what's most wanted."
            action={
              <Button onClick={() => navigate("/host/new")}>
                <Plus size={17} /> List your first experience
              </Button>
            }
          />
        ) : (
          <p className="muted">Past and cancelled experiences will show up here.</p>
        )}
      </section>
    </div>
  );
}

function Listing({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const pct = Math.min(100, Math.round((100 * plan.member_count) / plan.capacity));
  const cancelled = plan.status === "cancelled";
  const editable = !cancelled && !isPast(plan.starts_at);
  const names = plan.members.map((m) => m.name ?? "A member");

  return (
    <article>
      <Photo name={plan.interest_name} className="listing-photo" />
      <div>
        <div className="listing-badges">
          <Badge tone="sage">{plan.interest_name}</Badge>
          {cancelled && <Badge tone="rust">Cancelled</Badge>}
        </div>
        <h3>
          <button className="linkish listing-title" onClick={() => navigate(`/plan/${plan.id}`)}>
            {plan.title}
          </button>
        </h3>
        <p>
          {relativeDay(plan.starts_at)} &middot; {formatTime(plan.starts_at)} &middot; {plan.location}{" "}
          &middot; {formatPrice(plan.price_cents)}
        </p>
        <div className="listing-actions">
          <button className="linkish" aria-expanded={open} onClick={() => setOpen((x) => !x)}>
            {open ? "Hide" : "Show"} who&rsquo;s signed up
          </button>
          {editable && (
            <button className="linkish" onClick={() => navigate(`/plan/${plan.id}/edit`)}>
              <Pencil size={13} /> Edit
            </button>
          )}
          <button className="linkish" onClick={() => navigate(`/plan/${plan.id}`)}>
            Open listing <ArrowRight size={13} />
          </button>
        </div>
        {open && (
          <div className="roster">
            {names.length ? (
              <ul>
                {names.map((n, i) => (
                  <li key={plan.members[i]!.user_id}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No sign-ups yet. Share the listing link to get the first one.</p>
            )}
          </div>
        )}
      </div>
      <div className="fill-stat">
        <strong>
          {plan.member_count}/{plan.capacity}
        </strong>
        <span>signed up</span>
      </div>
      <div className="mini-progress" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </article>
  );
}

// Anonymous demand across Ann Arbor, from the same totals every member already sees.
function Demand({ stats }: { stats: InterestStat[] }) {
  const [category, setCategory] = useState("All");

  const rows = useMemo(
    () =>
      stats
        .filter((s) => category === "All" || s.category === category)
        .filter((s) => s.listed > 0)
        .sort((a, b) => b.want_join - a.want_join || b.listed - a.listed || a.name.localeCompare(b.name))
        .slice(0, 6),
    [stats, category],
  );
  const max = Math.max(1, ...rows.map((r) => r.listed));
  // The biggest gap: people ready to go, and nothing on the calendar.
  const gap = [...stats]
    .filter((s) => (category === "All" || s.category === category) && s.ready > 0 && s.open_plans === 0)
    .sort((a, b) => b.ready - a.ready)[0];

  return (
    <div className="demand-card">
      <p className="eyebrow">What beginners nearby want to try</p>
      <h2>Demand in Ann Arbor</h2>
      <div className="filter-row compact" role="group" aria-label="Filter by category">
        {categories.map((c) => (
          <button
            key={c}
            className={category === c ? "active" : ""}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className="demand-bars">
          {rows.map((r) => (
            <button key={r.interest_id} onClick={() => navigate(`/host/new/${r.interest_id}`)}>
              <span>
                <b>{r.listed}</b> {r.name}
              </span>
              <i title={`${r.listed} on lists, ${r.want_join} want to go with others, ${r.ready} ready`}>
                <b style={{ width: `${(100 * r.listed) / max}%` }}>
                  <em style={{ width: r.listed ? `${(100 * r.want_join) / r.listed}%` : 0 }} />
                </b>
              </i>
            </button>
          ))}
          <p className="demand-legend">
            <span className="swatch listed" /> On Never-Done Lists <span className="swatch join" /> Want to
            go with others
          </p>
        </div>
      ) : (
        <p className="muted demand-empty">Nobody has listed anything in this category yet.</p>
      )}
      <p className="host-insight">
        {gap ? (
          <>
            {gap.ready} {gap.ready === 1 ? "person is" : "people are"} ready to try{" "}
            <strong>{gap.name.toLowerCase()}</strong> and nothing is on the calendar.{" "}
            <button className="linkish" onClick={() => navigate(`/host/new/${gap.interest_id}`)}>
              List one <ArrowRight size={13} />
            </button>
          </>
        ) : (
          "Totals are anonymous and never show who. Tap any row to list an experience for it."
        )}
      </p>
    </div>
  );
}

export function HostCallout() {
  const { host } = useStore();
  return (
    <div className="host-callout">
      <div>
        <p className="eyebrow">
          <Store size={14} /> {host ? "Hosting" : "Run a studio, gym, or venue?"}
        </p>
        <h3>{host ? host.business_name : "Host experiences for beginners"}</h3>
        <p>
          {host
            ? "Manage your listings and see what people nearby want to try."
            : "List classes and events, and see anonymous demand for what you teach."}
        </p>
      </div>
      <Button variant="secondary" onClick={() => navigate(host ? "/host" : "/host/setup")}>
        {host ? "Open dashboard" : "Start hosting"} <ArrowRight size={17} />
      </Button>
    </div>
  );
}

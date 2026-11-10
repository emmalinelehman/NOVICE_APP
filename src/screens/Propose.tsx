import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, DollarSign, MapPin } from "lucide-react";
import * as api from "@/lib/api";
import { useStore, useDerived } from "@/lib/store";
import { goBack, navigate } from "@/lib/router";
import { isPast } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { Back, Button, Empty, ErrorBanner, Field } from "@/components/ui";

// One form, three uses: a member proposing a peer plan, a host listing an experience, and an
// organizer (either kind) editing an upcoming plan.

type Mode = "propose" | "host" | "edit";

type FormState = {
  interestId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  details: string;
  size: string;
  price: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
function localDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function localTimeString(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Propose({ interestId }: { interestId: number }) {
  const { statById } = useDerived();
  const stat = statById.get(interestId);
  if (!stat) {
    return (
      <div className="page narrow">
        <Back onClick={() => goBack("/explore")} label="Back" />
        <Empty title="We couldn't find that interest." text="Pick an interest first, then propose a plan." />
      </div>
    );
  }
  return (
    <PlanForm
      mode="propose"
      back={{ label: stat.name, path: `/interest/${interestId}` }}
      initial={{ interestId: String(interestId), size: "6" }}
      heading={
        <>
          <p className="eyebrow">Make the first move</p>
          <h1>Propose a plan</h1>
          <p className="lede">
            Keep it simple. A clear time and a public place is usually all a group of beginners
            needs.
            {stat.want_join > 0 &&
              ` ${stat.want_join} ${stat.want_join === 1 ? "person has" : "people have"} said they'd join.`}
          </p>
        </>
      }
    />
  );
}

export function HostNewListing({ interestId }: { interestId: number | null }) {
  const { host } = useStore();
  if (!host) {
    return (
      <div className="page narrow">
        <Back onClick={() => goBack("/profile")} label="Back" />
        <Empty
          title="Set up your host profile first."
          text="It takes a minute: your business name and a short description."
          action={<Button onClick={() => navigate("/host/setup", { replace: true })}>Set up hosting</Button>}
        />
      </div>
    );
  }
  return (
    <PlanForm
      mode="host"
      back={{ label: "Host dashboard", path: "/host" }}
      initial={{ interestId: interestId ? String(interestId) : "", size: "10" }}
      heading={
        <>
          <p className="eyebrow">{host.business_name}</p>
          <h1>List an experience</h1>
          <p className="lede">
            Beginners on NOVICE see this next to plans from other members. Say plainly what
            happens, what it costs, and that no experience is needed.
          </p>
        </>
      }
    />
  );
}

export function EditPlan({ id }: { id: number }) {
  const { plans, session } = useStore();
  const plan = plans.find((p) => p.id === id);
  if (!plan || plan.organizer_id !== session.userId) {
    return (
      <div className="page narrow">
        <Back onClick={() => goBack(`/plan/${id}`)} label="Back" />
        <Empty title="You can't edit this plan." text="Only the person who organized a plan can change it." />
      </div>
    );
  }
  if (plan.status === "cancelled" || isPast(plan.starts_at)) {
    return (
      <div className="page narrow">
        <Back onClick={() => goBack(`/plan/${id}`)} label="Back" />
        <Empty
          title="This plan can't be changed anymore."
          text={plan.status === "cancelled" ? "It was cancelled." : "It has already started."}
        />
      </div>
    );
  }
  return <EditPlanForm plan={plan} />;
}

function EditPlanForm({ plan }: { plan: Plan }) {
  const start = new Date(plan.starts_at);
  return (
    <PlanForm
      mode="edit"
      plan={plan}
      back={{ label: plan.title, path: `/plan/${plan.id}` }}
      initial={{
        interestId: String(plan.interest_id),
        title: plan.title,
        date: localDateString(start),
        time: localTimeString(start),
        location: plan.location,
        details: plan.details ?? "",
        size: String(plan.capacity),
        price: plan.price_cents ? String(plan.price_cents / 100) : "",
      }}
      heading={
        <>
          <p className="eyebrow">{plan.interest_name}</p>
          <h1>Edit {plan.kind === "hosted" ? "listing" : "plan"}</h1>
          <p className="lede">
            {plan.member_count > (plan.kind === "hosted" ? 0 : 1)
              ? "People have already joined. If you change the time or place, tell them in the group messages."
              : "Nobody else has joined yet, so change anything you like."}
          </p>
        </>
      }
    />
  );
}

function PlanForm({
  mode,
  plan,
  initial,
  heading,
  back,
}: {
  mode: Mode;
  plan?: Plan;
  initial: Partial<FormState>;
  heading: ReactNode;
  back: { label: string; path: string };
}) {
  const { refresh, notify, stats } = useStore();
  const hosted = mode === "host" || plan?.kind === "hosted";
  const maxSize = hosted ? 200 : 30;
  const [form, setForm] = useState<FormState>({
    interestId: "",
    title: "",
    date: "",
    time: "",
    location: "",
    details: "",
    size: "6",
    price: "",
    ...initial,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const maxDate = new Date(Date.now() + 120 * 86400000);
  const update = (key: keyof FormState, value: string) => setForm((x) => ({ ...x, [key]: value }));
  const interestName = stats.find((s) => String(s.interest_id) === form.interestId)?.name ?? "";
  const sortedStats = [...stats].sort((a, b) => a.name.localeCompare(b.name));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");
    const next: Record<string, string> = {};
    if (!form.interestId) next.interestId = "Choose what people will try.";
    const title = form.title.trim();
    if (title.length < 4) next.title = "Give it a title (at least 4 characters).";
    if (title.length > 80) next.title = "Keep the title under 80 characters.";
    let startsAt: Date | null = null;
    if (!form.date) next.date = "Choose a date.";
    if (!form.time) next.time = "Choose a time.";
    if (form.date && form.time) {
      startsAt = new Date(`${form.date}T${form.time}`);
      if (Number.isNaN(startsAt.getTime())) next.date = "That date doesn't look right.";
      else if (startsAt.getTime() <= Date.now()) next.date = "Choose a time in the future.";
      else if (startsAt > maxDate) next.date = "Choose a date within the next 4 months.";
    }
    if (form.location.trim().length < 2) next.location = "Add a meeting place.";
    const size = Number(form.size);
    if (!Number.isInteger(size) || size < 2 || size > maxSize)
      next.size = `Group size must be 2 to ${maxSize}.`;
    else if (plan && size < plan.member_count)
      next.size = `${plan.member_count} people are already going, so it can't be smaller than that.`;
    let priceCents: number | null = null;
    if (hosted && form.price.trim()) {
      const dollars = Number(form.price.replace(/^\$/, ""));
      if (!Number.isFinite(dollars) || dollars < 0 || dollars > 1000)
        next.price = "Enter a price from $0 to $1,000, or leave it blank if it's free.";
      else priceCents = Math.round(dollars * 100) || null;
    }
    setErrors(next);
    if (Object.keys(next).length || !startsAt) return;

    const fields = {
      title,
      startsAt: startsAt.toISOString(),
      location: form.location.trim(),
      details: form.details.trim(),
      capacity: size,
      priceCents,
    };
    setBusy(true);
    try {
      if (plan) {
        await api.updatePlan(plan.id, fields);
        await refresh();
        notify("Changes saved");
        navigate(`/plan/${plan.id}`, { replace: true });
      } else {
        const id = await api.createPlan({
          ...fields,
          interestId: Number(form.interestId),
          asHost: mode === "host",
        });
        await refresh();
        notify(
          mode === "host"
            ? "Your experience is live. Beginners can sign up now."
            : "Your plan is live. Share the link so people can join.",
        );
        navigate(`/plan/${id}`, { replace: true });
      }
    } catch (err) {
      setServerError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <Back onClick={() => goBack(back.path)} label={back.label} />
      <div className="page-heading">{heading}</div>
      <form className="plan-form" onSubmit={submit} noValidate>
        {mode === "host" && (
          <Field
            label="What will people try?"
            error={errors.interestId}
            hint="Pick the closest match so it shows up for people who have it on their list."
          >
            <div className="select-wrap">
              <select value={form.interestId} onChange={(e) => update("interestId", e.target.value)}>
                <option value="">Choose one</option>
                {sortedStats.map((s) => (
                  <option key={s.interest_id} value={s.interest_id}>
                    {s.name}
                    {s.want_join > 0 ? ` (${s.want_join} want to try it)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        )}
        <Field
          label={hosted ? "Experience title" : "Plan title"}
          error={errors.title}
          hint="Say what you'll do, in plain words."
        >
          <input
            value={form.title}
            maxLength={80}
            onChange={(e) => update("title", e.target.value)}
            placeholder={
              hosted
                ? `Intro to ${(interestName || "pottery").toLowerCase()} for total beginners`
                : `First time trying ${interestName.toLowerCase()}`
            }
          />
        </Field>
        <div className="form-two">
          <Field label="Date" error={errors.date}>
            <input
              type="date"
              value={form.date}
              min={localDateString(today)}
              max={localDateString(maxDate)}
              onChange={(e) => update("date", e.target.value)}
            />
          </Field>
          <Field label="Start time" error={errors.time}>
            <input type="time" value={form.time} onChange={(e) => update("time", e.target.value)} />
          </Field>
        </div>
        <Field
          label={hosted ? "Address" : "Where to meet"}
          error={errors.location}
          hint={
            hosted
              ? "Where people should show up, including the entrance or room if it's tricky."
              : "Pick a public place, like a park entrance, a cafe, or a studio."
          }
        >
          <div className="input-icon">
            <MapPin size={17} />
            <input
              value={form.location}
              maxLength={120}
              onChange={(e) => update("location", e.target.value)}
              placeholder={hosted ? "e.g. 201 Hill St, side door" : "e.g. Nichols Arboretum, Geddes Ave entrance"}
            />
          </div>
        </Field>
        <Field
          label="Details (optional)"
          hint={
            hosted
              ? "What happens, what to wear or bring, and anything included in the price."
              : "What to bring, cost if any, how you'll find each other."
          }
        >
          <textarea
            value={form.details}
            maxLength={500}
            rows={4}
            onChange={(e) => update("details", e.target.value)}
            placeholder={
              hosted
                ? "e.g. 90 minutes, clay and firing included. Wear clothes that can get muddy."
                : "e.g. Drop-in class is $15, I'll be by the front desk in a green jacket."
            }
          />
        </Field>
        <div className={hosted ? "form-two" : undefined}>
          <Field
            label={hosted ? "Spots" : "Group size"}
            error={errors.size}
            hint={hosted ? `How many beginners can sign up. Up to ${maxSize}.` : "Including you. 2 to 30 people."}
          >
            <input
              type="number"
              inputMode="numeric"
              min={2}
              max={maxSize}
              value={form.size}
              onChange={(e) => update("size", e.target.value)}
            />
          </Field>
          {hosted && (
            <Field
              label="Price per person (optional)"
              error={errors.price}
              hint="Paid at your venue. NOVICE never takes payment. Leave blank if free."
            >
              <div className="input-icon">
                <DollarSign size={17} />
                <input
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="0"
                />
              </div>
            </Field>
          )}
        </div>
        {Object.keys(errors).length > 0 && (
          <div className="form-error">A few details need your attention.</div>
        )}
        {serverError && <ErrorBanner message={serverError} />}
        <div className="form-actions">
          <Button variant="text" onClick={() => goBack(back.path)}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            {plan ? "Save changes" : hosted ? "Publish experience" : "Publish plan"} <ArrowRight size={17} />
          </Button>
        </div>
      </form>
    </div>
  );
}

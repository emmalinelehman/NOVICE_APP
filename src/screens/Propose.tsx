import { useState, type FormEvent } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import * as api from "@/lib/api";
import { useStore, useDerived } from "@/lib/store";
import { goBack, navigate } from "@/lib/router";
import { Back, Button, Empty, ErrorBanner, Field } from "@/components/ui";

function localDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function Propose({ interestId }: { interestId: number }) {
  const { refresh, notify } = useStore();
  const { statById } = useDerived();
  const stat = statById.get(interestId);
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    details: "",
    size: "6",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!stat) {
    return (
      <div className="page narrow">
        <Back onClick={() => goBack("/explore")} label="Back" />
        <Empty title="We couldn't find that interest." text="Pick an interest first, then propose a plan." />
      </div>
    );
  }

  const today = new Date();
  const maxDate = new Date(Date.now() + 120 * 86400000);
  const update = (key: keyof typeof form, value: string) => setForm((x) => ({ ...x, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");
    const next: Record<string, string> = {};
    const title = form.title.trim();
    if (title.length < 4) next.title = "Give your plan a title (at least 4 characters).";
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
    if (!Number.isInteger(size) || size < 2 || size > 30) next.size = "Group size must be 2 to 30.";
    setErrors(next);
    if (Object.keys(next).length || !startsAt) return;

    setBusy(true);
    try {
      const id = await api.createPlan({
        interestId,
        title,
        startsAt: startsAt.toISOString(),
        location: form.location.trim(),
        details: form.details.trim(),
        capacity: size,
      });
      await refresh();
      notify("Your plan is live. Share the link so people can join.");
      navigate(`/plan/${id}`, { replace: true });
    } catch (err) {
      setServerError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <Back onClick={() => goBack(`/interest/${interestId}`)} label={stat.name} />
      <div className="page-heading">
        <p className="eyebrow">Make the first move</p>
        <h1>Propose a plan</h1>
        <p className="lede">
          Keep it simple. A clear time and a public place is usually all a group of beginners needs.
          {stat.want_join > 0 &&
            ` ${stat.want_join} ${stat.want_join === 1 ? "person has" : "people have"} said they'd join.`}
        </p>
      </div>
      <form className="plan-form" onSubmit={submit} noValidate>
        <Field
          label="Plan title"
          error={errors.title}
          hint="Say what you'll do, in plain words."
        >
          <input
            value={form.title}
            maxLength={80}
            onChange={(e) => update("title", e.target.value)}
            placeholder={`First time trying ${stat.name.toLowerCase()}`}
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
          label="Where to meet"
          error={errors.location}
          hint="Pick a public place, like a park entrance, a cafe, or a studio."
        >
          <div className="input-icon">
            <MapPin size={17} />
            <input
              value={form.location}
              maxLength={120}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Nichols Arboretum, Geddes Ave entrance"
            />
          </div>
        </Field>
        <Field
          label="Details (optional)"
          hint="What to bring, cost if any, how you'll find each other."
        >
          <textarea
            value={form.details}
            maxLength={500}
            rows={4}
            onChange={(e) => update("details", e.target.value)}
            placeholder="e.g. Drop-in class is $15, I'll be by the front desk in a green jacket."
          />
        </Field>
        <Field label="Group size" error={errors.size} hint="Including you. 2 to 30 people.">
          <input
            type="number"
            inputMode="numeric"
            min={2}
            max={30}
            value={form.size}
            onChange={(e) => update("size", e.target.value)}
          />
        </Field>
        {Object.keys(errors).length > 0 && (
          <div className="form-error">A few details need your attention.</div>
        )}
        {serverError && <ErrorBanner message={serverError} />}
        <div className="form-actions">
          <Button variant="text" onClick={() => goBack(`/interest/${interestId}`)}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            Publish plan <ArrowRight size={17} />
          </Button>
        </div>
      </form>
    </div>
  );
}

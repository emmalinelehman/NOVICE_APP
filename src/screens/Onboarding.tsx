import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import { welcomePhoto } from "@/lib/photos";
import { Button, ErrorBanner, Logo, Photo } from "@/components/ui";

const MIN_PICKS = 3;

export function Onboarding() {
  const { profile, stats, refresh } = useStore();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [showAll, setShowAll] = useState(false);
  // Most-picked first, so new people land on the same interests as earlier ones.
  const suggested = stats
    .filter((s) => s.is_suggested)
    .sort((a, b) => b.listed - a.listed || a.interest_id - b.interest_id);
  const choices = showAll ? suggested : suggested.slice(0, 12);
  const total = picks.length + custom.length;

  const toggle = (id: number) =>
    setPicks((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const addCustom = () => {
    const clean = draft.trim().replace(/\s+/g, " ");
    if (clean.length < 2) return;
    if (!custom.some((c) => c.toLowerCase() === clean.toLowerCase())) setCustom((c) => [...c, clean]);
    setDraft("");
  };

  const finish = async (save: boolean) => {
    setBusy(true);
    setError("");
    try {
      if (save) {
        for (const id of picks) await api.addToList(id);
        for (const name of custom) await api.addCustomInterest(name);
      }
      await api.finishOnboarding();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="onboarding">
      <header>
        <Logo />
        <button onClick={() => finish(false)} disabled={busy}>
          Skip for now
        </button>
      </header>
      <div className="onboarding-progress" aria-label={`Step ${step + 1} of 2`}>
        {[0, 1].map((i) => (
          <span key={i} className={step >= i ? "active" : ""} />
        ))}
      </div>

      {step === 0 && (
        <section className="welcome-step">
          <div className="welcome-copy">
            <p className="eyebrow">Welcome, {profile?.display_name}</p>
            <h1>Here&rsquo;s how NOVICE works.</h1>
            <ol className="how-list">
              <li>
                <strong>Save things you&rsquo;ve never done.</strong>
                <span>Big or small. Nothing on your list is a commitment.</span>
              </li>
              <li>
                <strong>See who else wants to try them.</strong>
                <span>You&rsquo;ll see anonymous totals, never names, until someone makes a plan.</span>
              </li>
              <li>
                <strong>Join or propose a plan.</strong>
                <span>Pick a time and a public place, and go try it with other beginners.</span>
              </li>
            </ol>
            <Button onClick={() => setStep(1)}>
              Pick my first few <ArrowRight size={18} />
            </Button>
          </div>
          <div className="welcome-photo">
            <img src={welcomePhoto} alt="Beginners carrying kayaks to the water together" />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="pick-step">
          <div className="onboarding-title">
            <p className="eyebrow">Start your Never-Done List</p>
            <h1>What have you always wanted to try?</h1>
            <p>Pick at least {MIN_PICKS}. You can change these anytime.</p>
          </div>
          <div className="onboarding-picks">
            {choices.map((s) => {
              const on = picks.includes(s.interest_id);
              return (
                <button
                  key={s.interest_id}
                  className={on ? "selected" : ""}
                  aria-pressed={on}
                  onClick={() => toggle(s.interest_id)}
                >
                  <Photo name={s.name} />
                  <span>{s.name}</span>
                  <i>{on ? <Check size={17} /> : <Plus size={17} />}</i>
                </button>
              );
            })}
          </div>
          {!showAll && suggested.length > choices.length && (
            <button className="linkish show-all" onClick={() => setShowAll(true)}>
              Show all {suggested.length} ideas
            </button>
          )}
          <div className="custom-add">
            <label htmlFor="custom-interest">Something more specific?</label>
            <div className="add-row">
              <Plus size={20} />
              <input
                id="custom-interest"
                value={draft}
                maxLength={60}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder="e.g. Climb the big rock in Gallup Park"
              />
              <Button variant="secondary" onClick={addCustom} disabled={draft.trim().length < 2}>
                Add
              </Button>
            </div>
            {custom.length > 0 && (
              <div className="chip-row">
                {custom.map((c) => (
                  <button
                    key={c}
                    className="chip"
                    onClick={() => setCustom((x) => x.filter((v) => v !== c))}
                    aria-label={`Remove ${c}`}
                  >
                    {c} <span aria-hidden="true">&times;</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <ErrorBanner message={error} />}
          <div className="onboarding-actions">
            <button onClick={() => setStep(0)}>
              <ArrowLeft size={17} /> Back
            </button>
            <Button onClick={() => finish(true)} disabled={total < MIN_PICKS} busy={busy}>
              {total < MIN_PICKS ? `Pick ${MIN_PICKS - total} more` : `Save ${total} and continue`}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/format";
import { Button, Field } from "@/components/ui";
import { HostCallout } from "@/screens/Host";

const neighborhoods = [
  "",
  "Burns Park",
  "Central Campus",
  "Downtown",
  "Kerrytown",
  "Lower Town",
  "North Campus",
  "Old West Side",
  "South Campus",
  "Water Hill",
  "Ypsilanti",
  "Elsewhere nearby",
];

export function Profile() {
  const { profile, session, list, plans, run } = useStore();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [hood, setHood] = useState(profile?.neighborhood ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setHood(profile?.neighborhood ?? "");
  }, [profile]);

  const firsts = list.filter((l) => l.completed_at).length;
  const joined = plans.filter((p) => p.is_member).length;
  const dirty = name.trim() !== (profile?.display_name ?? "") || hood !== (profile?.neighborhood ?? "");

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Add your first name.");
    setError("");
    setBusy(true);
    await run(() => api.updateProfile(name.trim(), hood), "Profile saved");
    setBusy(false);
  };

  return (
    <div className="page narrow">
      <div className="page-heading">
        <p className="eyebrow">Your corner of NOVICE</p>
        <h1>{profile?.display_name}</h1>
        <p className="lede">
          {firsts} first{firsts === 1 ? "" : "s"} &middot; {joined} plan{joined === 1 ? "" : "s"}
        </p>
      </div>

      <div className="profile-card">
        <div className="avatar">{initials(profile?.display_name)}</div>
        <div>
          <strong>{profile?.display_name}</strong>
          <span>{session.email}</span>
        </div>
      </div>

      <form className="plan-form profile-form" onSubmit={save} noValidate>
        <Field label="First name" error={error} hint="Shown to people in plans you join.">
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Neighborhood (optional)" hint="Not shown to anyone yet. Helps us plan future features.">
          <div className="select-wrap">
            <select value={hood} onChange={(e) => setHood(e.target.value)}>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n || "Choose one"}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <div className="form-actions">
          <Button type="submit" disabled={!dirty} busy={busy}>
            Save changes
          </Button>
        </div>
      </form>

      <HostCallout />

      <section className="settings">
        <div className="about-card">
          <p className="eyebrow">About this beta</p>
          <p>
            NOVICE is a University of Michigan student project testing whether shared curiosity
            turns into real plans. Your Never-Done List is private. Others see anonymous totals,
            and your first name only when you join a plan.
          </p>
        </div>
        <button className="setting-link" onClick={() => api.signOut()}>
          Sign out <LogOut size={17} />
        </button>
      </section>
    </div>
  );
}

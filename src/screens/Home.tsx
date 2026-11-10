import { ArrowRight, CalendarDays, Check, MapPin, Plus, X } from "lucide-react";
import { useStore, useDerived } from "@/lib/store";
import * as api from "@/lib/api";
import { navigate } from "@/lib/router";
import { formatTime, relativeDay } from "@/lib/format";
import { Badge, Button, Photo } from "@/components/ui";
import { photoFor } from "@/lib/photos";
import { PlanCard } from "@/components/PlanCard";

export function Home() {
  const { profile, list, plans, run } = useStore();
  const { statById, upcoming } = useDerived();
  const now = Date.now();

  const myUpcoming = upcoming.filter((p) => p.is_member);
  const next = myUpcoming[0];

  // Plans that happened in the last 3 weeks where I haven't said whether I went.
  const needsCheckIn = plans.filter(
    (p) =>
      p.is_member &&
      p.status === "open" &&
      p.my_attended === null &&
      new Date(p.starts_at).getTime() <= now &&
      now - new Date(p.starts_at).getTime() < 21 * 86400000,
  );

  const active = list.filter((l) => !l.completed_at);
  const activeIds = new Set(active.map((l) => l.interest_id));
  const joinable = upcoming
    .filter((p) => !p.is_member && activeIds.has(p.interest_id) && p.member_count < p.capacity)
    .slice(0, 4);

  const interests = active
    .map((l) => ({ item: l, stat: statById.get(l.interest_id) }))
    .sort((a, b) => (b.stat?.listed ?? 0) - (a.stat?.listed ?? 0))
    .slice(0, 4);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="page dashboard">
      <div className="dashboard-greeting">
        <div>
          <p className="eyebrow">{today} in Ann Arbor</p>
          <h1>What will you try next, {profile?.display_name}?</h1>
        </div>
        <button className="quick-add" onClick={() => navigate("/explore")}>
          <Plus size={19} /> Add something new
        </button>
      </div>

      {needsCheckIn.map((p) => (
        <section className="checkin" key={p.id} aria-live="polite">
          <div>
            <p className="eyebrow">Quick check-in</p>
            <h2>Did you make it to &ldquo;{p.title}&rdquo;?</h2>
            <p>Your answer helps us learn whether NOVICE plans actually happen.</p>
          </div>
          <div className="checkin-actions">
            <Button onClick={() => run(() => api.setAttended(p.id, true), "Nice. Added to your Firsts.")}>
              <Check size={17} /> Yes, I went
            </Button>
            <Button
              variant="secondary"
              onClick={() => run(() => api.setAttended(p.id, false), "Thanks for letting us know.")}
            >
              <X size={17} /> I didn&rsquo;t go
            </Button>
          </div>
        </section>
      ))}

      <section className="home-feature">
        <Photo
          name={next?.interest_name ?? active.find((l) => photoFor(l.name))?.name ?? "Kayaking"}
          className="home-feature-img"
        />
        <div className="home-feature-copy">
          <Badge tone="rust">Your next first</Badge>
          {next ? (
            <>
              <h2>{next.title}</h2>
              <p>
                <CalendarDays size={16} /> {relativeDay(next.starts_at)} at {formatTime(next.starts_at)}
              </p>
              <p>
                <MapPin size={16} /> {next.location}
              </p>
              <Button onClick={() => navigate(`/plan/${next.id}`)}>
                See plan details <ArrowRight size={17} />
              </Button>
              {myUpcoming.length > 1 && (
                <p className="feature-more">
                  +{myUpcoming.length - 1} more plan{myUpcoming.length > 2 ? "s" : ""} below
                </p>
              )}
            </>
          ) : (
            <>
              <h2>Nothing on your calendar yet.</h2>
              <p>
                Join a plan for something on your list, or propose one. Most plans only need two
                or three people.
              </p>
              <Button
                onClick={() =>
                  navigate(active[0] ? `/interest/${active[0].interest_id}` : "/explore")
                }
              >
                Find or start a plan <ArrowRight size={17} />
              </Button>
            </>
          )}
        </div>
      </section>

      {myUpcoming.length > 1 && (
        <section className="home-section">
          <div className="home-section-title">
            <div>
              <p className="eyebrow">You&rsquo;re going</p>
              <h2>Your upcoming plans</h2>
            </div>
          </div>
          <div className="plan-grid">
            {myUpcoming.slice(1).map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-section-title">
          <div>
            <p className="eyebrow">From your list</p>
            <h2>Plans you could join</h2>
          </div>
          <button onClick={() => navigate("/explore")}>
            Explore all <ArrowRight size={16} />
          </button>
        </div>
        {joinable.length ? (
          <div className="plan-grid">
            {joinable.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
        ) : (
          <div className="hint-card">
            <strong>No open plans for your interests yet.</strong>
            <p>
              Someone has to go first. Open an interest below and propose a simple plan: a time, a
              public place, and a group size.
            </p>
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-title">
          <div>
            <p className="eyebrow">Your interests</p>
            <h2>Who else wants to try them</h2>
          </div>
          <button onClick={() => navigate("/list")}>
            Your full list <ArrowRight size={16} />
          </button>
        </div>
        {interests.length ? (
          <div className="momentum-grid">
            {interests.map(({ item, stat }) => {
              const others = Math.max(0, (stat?.listed ?? 1) - 1);
              return (
                <button key={item.interest_id} onClick={() => navigate(`/interest/${item.interest_id}`)}>
                  <Photo name={item.name} className="momentum-img" />
                  <div>
                    <h3>{item.name}</h3>
                    <span>
                      {others === 0 ? (
                        "You're the first. Invite a friend."
                      ) : (
                        <>
                          <strong>{others}</strong> {others === 1 ? "other person" : "others"} want to try it
                          {stat?.open_plans ? ` · ${stat.open_plans} open plan${stat.open_plans > 1 ? "s" : ""}` : ""}
                        </>
                      )}
                    </span>
                  </div>
                  <ArrowRight size={18} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="hint-card">
            <strong>Your list is empty.</strong>
            <p>Add a few things you&rsquo;ve always wanted to try to see who else is curious.</p>
            <Button onClick={() => navigate("/explore")}>Browse ideas</Button>
          </div>
        )}
      </section>

      <section className="home-how">
        <div>
          <span>1</span>
          <strong>Save an idea</strong>
          <p>Add anything you&rsquo;d like to try someday.</p>
        </div>
        <div>
          <span>2</span>
          <strong>Say where you are</strong>
          <p>Curious, want to join, or ready to plan. Only totals are shown.</p>
        </div>
        <div>
          <span>3</span>
          <strong>Try it together</strong>
          <p>Join or propose a plan and meet other beginners.</p>
        </div>
      </section>
    </div>
  );
}

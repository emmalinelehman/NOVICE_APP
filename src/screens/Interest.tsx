import { CircleHelp, Plus } from "lucide-react";
import { useState } from "react";
import * as api from "@/lib/api";
import { useStore, useDerived } from "@/lib/store";
import { goBack, navigate } from "@/lib/router";
import { intentCopy, type Intent } from "@/lib/types";
import { Back, Badge, Button, Empty, Photo } from "@/components/ui";
import { PlanCard } from "@/components/PlanCard";

const levels: Intent[] = ["curious", "join", "ready"];

export function InterestScreen({ id }: { id: number }) {
  const { run } = useStore();
  const { statById, listById, upcoming } = useDerived();
  const [showHelp, setShowHelp] = useState(false);
  const stat = statById.get(id);
  const mine = listById.get(id);

  if (!stat) {
    return (
      <div className="page">
        <Back onClick={() => goBack("/explore")} label="Back" />
        <Empty
          title="We couldn't find that interest."
          text="It may have been removed. Browse what people nearby want to try instead."
          action={<Button onClick={() => navigate("/explore")}>Go to Explore</Button>}
        />
      </div>
    );
  }

  const plans = upcoming.filter((p) => p.interest_id === id);
  const onList = Boolean(mine && !mine.completed_at);
  const others = Math.max(0, stat.listed - (onList ? 1 : 0));

  return (
    <div className="page">
      <Back onClick={() => goBack("/explore")} label="Back" />
      <div className="interest-hero">
        <div>
          <Badge>{stat.category}</Badge>
          <h1>{stat.name}</h1>
          <p className="lede">
            {others === 0
              ? "You'd be the first on NOVICE to want this. Propose a plan and share the link with a friend."
              : `${others} ${others === 1 ? "person" : "people"} on NOVICE ${others === 1 ? "wants" : "want"} to try this too. Nobody here has to know what they're doing yet.`}
          </p>
        </div>
        <Photo name={stat.name} className="interest-hero-img" />
      </div>

      <div className="counts-row" aria-label="Anonymous interest totals">
        <div>
          <strong>{stat.listed}</strong>
          <span>on Never-Done Lists</span>
        </div>
        <div>
          <strong>{stat.want_join}</strong>
          <span>want to try it with others</span>
        </div>
        <div>
          <strong>{stat.ready}</strong>
          <span>ready to make plans</span>
        </div>
        <div>
          <strong>{stat.done}</strong>
          <span>have done it</span>
        </div>
      </div>

      {mine?.completed_at ? (
        <div className="hint-card">
          <strong>You&rsquo;ve done this. It&rsquo;s in your Firsts.</strong>
          <p>You can still join plans below if you want to go again.</p>
        </div>
      ) : onList ? (
        <section className="intent-panel">
          <div>
            <p className="eyebrow">
              Where are you right now?
              <button
                className="help-toggle"
                aria-expanded={showHelp}
                aria-label="What do these levels mean?"
                onClick={() => setShowHelp((x) => !x)}
              >
                <CircleHelp size={16} />
              </button>
            </p>
            <span>You can change this anytime. Others see totals only.</span>
          </div>
          {showHelp && (
            <p className="help-text">
              <strong>Curious</strong> means it&rsquo;s just on your list. <strong>Want to join</strong>{" "}
              means you&rsquo;d go if someone made a plan. <strong>Ready to plan</strong> means you&rsquo;d
              go in the next few weeks. These help people decide whether a plan is worth proposing.
            </p>
          )}
          <div className="intent-options">
            {levels.map((level) => (
              <button
                key={level}
                className={mine?.intent === level ? "selected" : ""}
                aria-pressed={mine?.intent === level}
                onClick={() =>
                  mine?.intent !== level &&
                  run(() => api.setIntent(id, level), `Updated: ${intentCopy[level].label}`)
                }
              >
                <span className="radio">{mine?.intent === level && <span />}</span>
                <strong>{intentCopy[level].label}</strong>
                <small>{intentCopy[level].desc}</small>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="hint-card inline">
          <span>Add this to your Never-Done List so you count toward the totals above.</span>
          <Button onClick={() => run(() => api.addToList(id), "Added to your Never-Done List")}>
            <Plus size={17} /> Add to my list
          </Button>
        </div>
      )}

      <div className="section-title">
        <div>
          <p className="eyebrow">Plans taking shape</p>
          <h2>Try it with other first-timers</h2>
        </div>
        <Button onClick={() => navigate(`/interest/${id}/new-plan`)}>
          <Plus size={17} /> Propose a plan
        </Button>
      </div>
      {plans.length ? (
        <div className="plan-grid">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="No one has made the first move yet."
          text={
            stat.want_join > 0
              ? `${stat.want_join} ${stat.want_join === 1 ? "person wants" : "people want"} to try this with others. Propose something simple and see who joins.`
              : "Propose something simple: a time, a public place, and a small group. Then share the link."
          }
          action={
            <Button onClick={() => navigate(`/interest/${id}/new-plan`)}>Propose the first plan</Button>
          }
        />
      )}
    </div>
  );
}

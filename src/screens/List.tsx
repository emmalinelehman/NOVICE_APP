import { useState } from "react";
import { ArrowRight, Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import { useStore, useDerived } from "@/lib/store";
import { navigate } from "@/lib/router";
import { formatDate } from "@/lib/format";
import { intentCopy } from "@/lib/types";
import { Button, Empty, Photo } from "@/components/ui";

export function ListScreen() {
  const { list, stats, run } = useStore();
  const { statById } = useDerived();
  const [tab, setTab] = useState<"list" | "firsts">("list");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const active = list.filter((l) => !l.completed_at);
  const firsts = list
    .filter((l) => l.completed_at)
    .sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1));
  const onList = new Set(list.map((l) => l.interest_id));
  const suggestions = stats
    .filter((s) => s.is_suggested && !onList.has(s.interest_id))
    .sort((a, b) => b.listed - a.listed)
    .slice(0, 4);

  const add = async () => {
    const clean = draft.trim();
    if (clean.length < 2) return;
    setBusy(true);
    const ok = await run(() => api.addCustomInterest(clean), `Added "${clean}"`);
    if (ok) setDraft("");
    setBusy(false);
  };

  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Private to you</p>
        <h1>Never-Done List</h1>
        <p className="lede">
          Things you&rsquo;ve been meaning to try. Adding something isn&rsquo;t a commitment. Others
          only ever see totals, not your name.
        </p>
      </div>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "list"}
          className={tab === "list" ? "active" : ""}
          onClick={() => setTab("list")}
        >
          Never done <span>{active.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "firsts"}
          className={tab === "firsts" ? "active" : ""}
          onClick={() => setTab("firsts")}
        >
          Firsts <span>{firsts.length}</span>
        </button>
      </div>

      {tab === "list" ? (
        <>
          <form
            className="add-row"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <Plus size={20} />
            <input
              value={draft}
              maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Something you've never done..."
              aria-label="Add something you've never done"
            />
            <Button type="submit" disabled={draft.trim().length < 2} busy={busy}>
              Add to list
            </Button>
          </form>

          <section className="list-section">
            <div className="section-line">
              <p className="eyebrow">Your list</p>
              <span>Tap the circle when you&rsquo;ve done it</span>
            </div>
            {active.length === 0 ? (
              <Empty
                title="Your list has room to wander."
                text="Add an idea above, or pick one of the suggestions below."
              />
            ) : (
              <div className="never-list">
                {active.map((item) => {
                  const stat = statById.get(item.interest_id);
                  const others = Math.max(0, (stat?.listed ?? 1) - 1);
                  return (
                    <div className="never-item mvp" key={item.interest_id}>
                      <button
                        className="complete"
                        aria-label={`Mark ${item.name} as done`}
                        onClick={() =>
                          run(() => api.markDone(item.interest_id, true), "Moved to your Firsts")
                        }
                      >
                        <Check size={17} />
                      </button>
                      <Photo name={item.name} className="list-item-photo" alt="" />
                      <button
                        className="item-name"
                        onClick={() => navigate(`/interest/${item.interest_id}`)}
                      >
                        {item.name}
                        <small>
                          {intentCopy[item.intent].label} &middot;{" "}
                          {others === 0 ? "be the first" : `${others} other${others > 1 ? "s" : ""}`}
                          {stat?.open_plans ? ` · ${stat.open_plans} plan${stat.open_plans > 1 ? "s" : ""}` : ""}
                          <ArrowRight size={14} />
                        </small>
                      </button>
                      <button
                        className="row-icon"
                        aria-label={`Remove ${item.name}`}
                        onClick={() =>
                          run(() => api.removeFromList(item.interest_id), "Removed from your list")
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {suggestions.length > 0 && (
            <section className="suggestions">
              <p className="eyebrow">Popular in Ann Arbor</p>
              <div className="suggestion-grid">
                {suggestions.map((s, i) => (
                  <button
                    key={s.interest_id}
                    onClick={() => run(() => api.addToList(s.interest_id), `Added "${s.name}"`)}
                  >
                    <Photo name={s.name} className="suggestion-img" alt="" />
                    <span>0{i + 1}</span>
                    <strong>{s.name}</strong>
                    <Plus size={18} aria-label="Add" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : firsts.length ? (
        <section className="firsts">
          {firsts.map((x, i) => (
            <div key={x.interest_id}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <Check size={19} />
              <div>
                <strong>{x.name}</strong>
                <small>Done {formatDate(x.completed_at!)}</small>
              </div>
              <button
                className="row-icon"
                aria-label={`Move ${x.name} back to your list`}
                title="Move back to list"
                onClick={() =>
                  run(() => api.markDone(x.interest_id, false), "Moved back to your list")
                }
              >
                <RotateCcw size={16} />
              </button>
            </div>
          ))}
        </section>
      ) : (
        <Empty
          title="No firsts yet."
          text="When you try something on your list, tap its circle or check in after a plan. It will show up here."
        />
      )}
    </div>
  );
}

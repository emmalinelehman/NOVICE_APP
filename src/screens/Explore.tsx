import { useMemo, useState } from "react";
import { Heart, Plus, Search } from "lucide-react";
import * as api from "@/lib/api";
import { useStore, useDerived } from "@/lib/store";
import { navigate } from "@/lib/router";
import { Badge, Button, Empty, Photo } from "@/components/ui";

const categories = ["All", "Make", "Move", "Outdoors", "Cook", "Grow", "Perform", "Other"];

export function Explore() {
  const { stats, run, notify, refresh } = useStore();
  const { listById } = useDerived();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [busy, setBusy] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stats
      .filter((s) => (category === "All" || s.category === category) && s.name.toLowerCase().includes(q))
      .sort((a, b) => b.open_plans - a.open_plans || b.listed - a.listed || a.name.localeCompare(b.name));
  }, [stats, query, category]);

  const exact = stats.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());

  const addCustom = async () => {
    setBusy(true);
    try {
      const id = await api.addCustomInterest(query.trim());
      await refresh();
      notify(`Added "${query.trim()}" to your list`);
      navigate(`/interest/${id}`);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Ann Arbor, Michigan</p>
        <h1>Find your fellow beginners.</h1>
        <p className="lede">
          Tap the heart to add something to your list. Open any card to see who else is curious and
          what plans are forming.
        </p>
      </div>
      <div className="search-bar">
        <Search size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search things to try"
          aria-label="Search things to try"
          maxLength={60}
        />
      </div>
      <div className="filter-row" role="group" aria-label="Filter by category">
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

      {query.trim().length >= 2 && !exact && (
        <div className="hint-card inline">
          <span>
            Don&rsquo;t see it? Add <strong>&ldquo;{query.trim()}&rdquo;</strong> as your own idea.
            Others can find and join it too.
          </span>
          <Button variant="secondary" onClick={addCustom} busy={busy}>
            <Plus size={17} /> Add it
          </Button>
        </div>
      )}

      <div className="result-meta">
        <strong>
          {results.length} thing{results.length === 1 ? "" : "s"} to try
        </strong>
        <span>Counts are people on NOVICE, shown anonymously</span>
      </div>

      {results.length ? (
        <div className="interest-grid">
          {results.map((s) => {
            const mine = listById.get(s.interest_id);
            const saved = Boolean(mine && !mine.completed_at);
            return (
              <article className="interest-card" key={s.interest_id}>
                <button className="card-main" onClick={() => navigate(`/interest/${s.interest_id}`)}>
                  <Photo name={s.name} className="interest-photo" />
                  <Badge>{s.category}</Badge>
                  <h3>{s.name}</h3>
                  <p>
                    {s.open_plans > 0
                      ? `${s.open_plans} open plan${s.open_plans > 1 ? "s" : ""} you can join.`
                      : s.listed > 0
                        ? "No plan yet. You could start one."
                        : "Nobody's added this yet."}
                  </p>
                  <div className="intent-counts">
                    <span>
                      <b>{s.listed}</b> On lists
                    </span>
                    <span>
                      <b>{s.want_join}</b> Want to join
                    </span>
                    <span>
                      <b>{s.ready}</b> Ready
                    </span>
                  </div>
                </button>
                <button
                  className={`save-button ${saved ? "saved" : ""}`}
                  aria-label={saved ? `Remove ${s.name} from your list` : `Add ${s.name} to your list`}
                  aria-pressed={saved}
                  onClick={() =>
                    saved
                      ? run(() => api.removeFromList(s.interest_id), "Removed from your list")
                      : run(() => api.addToList(s.interest_id), "Added to your Never-Done List")
                  }
                >
                  <Heart size={18} fill={saved ? "currentColor" : "none"} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title="No matches yet."
          text="Try another word, clear the filter, or add your idea above."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}

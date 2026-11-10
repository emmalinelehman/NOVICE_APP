import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as api from "@/lib/api";
import type { Host, InterestStat, ListItem, Plan, Profile, Session } from "@/lib/types";

type Store = {
  session: Session;
  profile: Profile | null;
  /** The user's business profile, if they've set one up. */
  host: Host | null;
  stats: InterestStat[];
  list: ListItem[];
  plans: Plan[];
  loading: boolean;
  loadError: string;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  /** Runs an action, shows any error as a toast, refreshes data. Returns true on success. */
  run: (action: () => Promise<unknown>, success?: string) => Promise<boolean>;
  toast: string;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [host, setHost] = useState<Host | null>(null);
  const [stats, setStats] = useState<InterestStat[]>([]);
  const [list, setList] = useState<ListItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [p, h, s, l, pl] = await Promise.all([
        api.myProfile(),
        api.myHost(),
        api.interestStats(),
        api.myList(),
        api.allPlans(),
      ]);
      setProfile(p);
      setHost(h);
      setStats(s);
      setList(l);
      setPlans(pl);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>, success?: string) => {
      try {
        await action();
        if (success) notify(success);
        await refresh();
        return true;
      } catch (e) {
        notify((e as Error).message);
        await refresh();
        return false;
      }
    },
    [notify, refresh],
  );

  useEffect(() => {
    refresh();
    api.logVisit().catch(() => {});
    // Pick up changes other people made when the tab comes back into focus.
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [refresh, session.userId]);

  const value = useMemo(
    () => ({ session, profile, host, stats, list, plans, loading, loadError, refresh, notify, run, toast }),
    [session, profile, host, stats, list, plans, loading, loadError, refresh, notify, run, toast],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

/** Helpers derived from store data. */
export function useDerived() {
  const { stats, list, plans } = useStore();
  return useMemo(() => {
    const statById = new Map(stats.map((s) => [s.interest_id, s]));
    const listById = new Map(list.map((l) => [l.interest_id, l]));
    const now = Date.now();
    const upcoming = plans.filter(
      (p) => p.status === "open" && new Date(p.starts_at).getTime() > now,
    );
    return { statById, listById, upcoming };
  }, [stats, list, plans]);
}

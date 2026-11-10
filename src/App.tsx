import { useEffect, useState } from "react";
import { ArrowRight, Check, CircleUserRound, Compass, Home as HomeIcon, ListChecks, Store } from "lucide-react";
import * as api from "@/lib/api";
import type { Session } from "@/lib/types";
import { StoreProvider, useDerived, useStore } from "@/lib/store";
import { navigate, useRoute, type Route } from "@/lib/router";
import { initials } from "@/lib/format";
import { Button, Empty, ErrorBanner, Logo, PageLoading } from "@/components/ui";
import { AuthScreen, NotConfigured } from "@/screens/Auth";
import { Onboarding } from "@/screens/Onboarding";
import { Home } from "@/screens/Home";
import { ListScreen } from "@/screens/List";
import { Explore } from "@/screens/Explore";
import { InterestScreen } from "@/screens/Interest";
import { EditPlan, HostNewListing, Propose } from "@/screens/Propose";
import { HostDashboard, HostSetup } from "@/screens/Host";
import { PlanPage } from "@/screens/PlanPage";
import { Profile } from "@/screens/Profile";

const memberNav = [
  { path: "/", key: "home", label: "Home", icon: HomeIcon },
  { path: "/list", key: "list", label: "My List", icon: ListChecks },
  { path: "/explore", key: "explore", label: "Explore", icon: Compass },
  { path: "/profile", key: "profile", label: "Profile", icon: CircleUserRound },
];
// Hosts get one extra tab. Everything else stays the same: a host is a member too.
const hostNav = [...memberNav.slice(0, 3), { path: "/host", key: "host", label: "Host", icon: Store }, memberNav[3]!];

export default function App() {
  if (!api.isConfigured) return <NotConfigured />;
  return <AuthGate />;
}

function AuthGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    api
      .getSession()
      .then(setSession)
      .catch(() => setSession(null));
    return api.onAuthChange(setSession);
  }, []);

  if (session === undefined) return <PageLoading />;
  if (!session) return <AuthScreen />;
  return (
    <StoreProvider key={session.userId} session={session}>
      <Shell />
    </StoreProvider>
  );
}

function activeKey(route: Route) {
  if (route.name === "home" || route.name === "list" || route.name === "explore" || route.name === "profile")
    return route.name;
  if (route.name === "host" || route.name === "hostSetup" || route.name === "hostNew") return "host";
  return "explore";
}

function Shell() {
  const { profile, host, loading, loadError, refresh, toast } = useStore();
  const { upcoming } = useDerived();
  const route = useRoute();

  if (loading) return <PageLoading />;
  if (!profile) {
    return (
      <div className="page narrow">
        <Logo />
        <ErrorBanner
          message={loadError || "We couldn't load your profile."}
          onRetry={() => refresh()}
        />
        <Button variant="secondary" onClick={() => api.signOut()}>
          Sign out
        </Button>
      </div>
    );
  }
  if (!profile.onboarded) return <Onboarding />;

  const active = activeKey(route);
  const nav = host ? hostNav : memberNav;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav aria-label="Main">
          {nav.map(({ path, key, label, icon: Icon }) => (
            <button
              key={key}
              className={active === key ? "active" : ""}
              aria-current={active === key ? "page" : undefined}
              onClick={() => navigate(path)}
            >
              <Icon size={19} strokeWidth={1.7} />
              {label}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <p className="eyebrow">In Ann Arbor</p>
          <strong>
            {upcoming.length === 0
              ? "No open plans yet. Yours could be the first."
              : `${upcoming.length} open plan${upcoming.length > 1 ? "s" : ""} in Ann Arbor right now.`}
          </strong>
        </div>
        <button className="profile-chip" onClick={() => navigate("/profile")}>
          <span>{initials(profile.display_name)}</span>
          <div>
            <strong>{profile.display_name}</strong>
            <small>{profile.neighborhood || "Ann Arbor"}</small>
          </div>
          <ArrowRight size={16} />
        </button>
      </aside>

      <div className="main-wrap">
        <header className="mobile-header">
          <Logo />
        </header>
        <main>
          {loadError && (
            <div className="page-banner">
              <ErrorBanner message={loadError} onRetry={() => refresh()} />
            </div>
          )}
          <RouteView route={route} />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Main">
        {nav.map(({ path, key, label, icon: Icon }) => (
          <button
            key={key}
            className={active === key ? "active" : ""}
            aria-current={active === key ? "page" : undefined}
            onClick={() => navigate(path)}
          >
            <Icon size={22} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function RouteView({ route }: { route: Route }) {
  switch (route.name) {
    case "home":
      return <Home />;
    case "list":
      return <ListScreen />;
    case "explore":
      return <Explore />;
    case "profile":
      return <Profile />;
    case "interest":
      return <InterestScreen key={route.id} id={route.id} />;
    case "propose":
      return <Propose key={route.interestId} interestId={route.interestId} />;
    case "plan":
      return <PlanPage key={route.id} id={route.id} />;
    case "editPlan":
      return <EditPlan key={route.id} id={route.id} />;
    case "host":
      return <HostDashboard />;
    case "hostSetup":
      return <HostSetup />;
    case "hostNew":
      return <HostNewListing key={route.interestId ?? "any"} interestId={route.interestId} />;
    default:
      return (
        <div className="page">
          <Empty
            title="That page doesn't exist."
            text="The link may be old. Head home to see what's happening."
            action={<Button onClick={() => navigate("/")}>Go home</Button>}
          />
        </div>
      );
  }
}

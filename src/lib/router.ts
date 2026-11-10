import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "list" }
  | { name: "explore" }
  | { name: "profile" }
  | { name: "interest"; id: number }
  | { name: "propose"; interestId: number }
  | { name: "plan"; id: number }
  | { name: "editPlan"; id: number }
  | { name: "host" }
  | { name: "hostSetup" }
  | { name: "hostNew"; interestId: number | null }
  | { name: "notFound" };

export function parse(path: string): Route {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return { name: "home" };
  if (clean === "/list") return { name: "list" };
  if (clean === "/explore") return { name: "explore" };
  if (clean === "/profile") return { name: "profile" };
  let m = clean.match(/^\/interest\/(\d+)$/);
  if (m) return { name: "interest", id: Number(m[1]) };
  m = clean.match(/^\/interest\/(\d+)\/new-plan$/);
  if (m) return { name: "propose", interestId: Number(m[1]) };
  m = clean.match(/^\/plan\/(\d+)$/);
  if (m) return { name: "plan", id: Number(m[1]) };
  m = clean.match(/^\/plan\/(\d+)\/edit$/);
  if (m) return { name: "editPlan", id: Number(m[1]) };
  if (clean === "/host") return { name: "host" };
  if (clean === "/host/setup") return { name: "hostSetup" };
  if (clean === "/host/new") return { name: "hostNew", interestId: null };
  m = clean.match(/^\/host\/new\/(\d+)$/);
  if (m) return { name: "hostNew", interestId: Number(m[1]) };
  return { name: "notFound" };
}

// How many in-app pages deep we are, so Back never leaves the app.
let depth = 0;

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (path === window.location.pathname) return;
  if (opts.replace) window.history.replaceState(null, "", path);
  else {
    window.history.pushState(null, "", path);
    depth += 1;
  }
  window.dispatchEvent(new Event("novice:navigate"));
  window.scrollTo({ top: 0 });
}

export function goBack(fallback: string) {
  if (depth > 0) window.history.back();
  else navigate(fallback, { replace: true });
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.pathname));
  useEffect(() => {
    const update = () => setRoute(parse(window.location.pathname));
    const onPop = () => {
      depth = Math.max(0, depth - 1);
      update();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("novice:navigate", update);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("novice:navigate", update);
    };
  }, []);
  return route;
}

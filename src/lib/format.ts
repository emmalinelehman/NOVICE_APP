export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} at ${formatTime(iso)}`;
}

export function relativeDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(today)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return formatDate(iso);
}

export function initials(name: string | null | undefined) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function isPast(iso: string) {
  return new Date(iso).getTime() <= Date.now();
}

/** "Tomorrow, Nov 12" or "Thursday, Nov 12" or "Sat, Dec 6". */
export function longDay(iso: string) {
  const rel = relativeDay(iso);
  const md = new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return rel === formatDate(iso) ? rel : `${rel}, ${md}`;
}

/** "$35" or "$12.50"; null or 0 means free. */
export function formatPrice(cents: number | null | undefined) {
  if (!cents) return "Free";
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

/** Who a plan is "by": the business for hosted plans, the member's first name otherwise. */
export function plannerName(p: { kind: string; host_name: string | null; organizer_name: string | null }) {
  return p.kind === "hosted" ? (p.host_name ?? "a local host") : (p.organizer_name ?? "a member");
}

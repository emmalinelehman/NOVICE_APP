import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import type { Plan } from "@/lib/types";
import { formatTime, relativeDay } from "@/lib/format";
import { navigate } from "@/lib/router";
import { Badge, Photo } from "./ui";

export function PlanCard({ plan }: { plan: Plan }) {
  const spots = plan.capacity - plan.member_count;
  return (
    <button className="plan-card" onClick={() => navigate(`/plan/${plan.id}`)}>
      <Photo name={plan.interest_name} className="plan-card-photo" />
      <div>
        <Badge tone="sage">{plan.interest_name}</Badge>
        {plan.is_member ? (
          <strong className="card-flag">You&rsquo;re in</strong>
        ) : spots <= 0 ? (
          <strong className="card-flag muted">Full</strong>
        ) : null}
      </div>
      <h3>{plan.title}</h3>
      <p>
        <CalendarDays size={16} /> {relativeDay(plan.starts_at)} &middot; {formatTime(plan.starts_at)}
      </p>
      <p>
        <MapPin size={16} /> {plan.location}
      </p>
      <footer>
        <span>
          {plan.member_count}/{plan.capacity} going &middot; organized by {plan.organizer_name ?? "a member"}
        </span>
        <ArrowRight size={18} />
      </footer>
    </button>
  );
}

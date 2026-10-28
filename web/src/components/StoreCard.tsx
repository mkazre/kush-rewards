import { BadgeCheck, Star } from "lucide-react";
import { Link } from "react-router";
import { formatDistance, openState, TYPE_LABELS } from "@shared/lib/storeUtils";
import type { PublicStore } from "@shared/types/api";
import { VenueLogo } from "./ui";

export function OpenLine({ hours }: { hours: PublicStore["hours"] }) {
  const s = openState(hours);
  const color = s.isOpen === null ? "text-muted-fg" : s.isOpen ? "text-success" : "text-error";
  return <span className={`text-sm font-semibold ${color}`}>{s.text}</span>;
}

export function StoreCard({ store, km }: { store: PublicStore; km?: number }) {
  const features = store.features.slice(0, 3);
  return (
    <Link to={`/venue/${store.id}`} className="card group flex gap-4 p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg">
      <VenueLogo name={store.name} type={store.type} logoUrl={store.logoUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-lg font-bold group-hover:text-primary">{store.name}</h3>
          {km !== undefined && <span className="shrink-0 text-sm font-semibold text-muted-fg">{formatDistance(km)}</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-fg">
          {store.isPartner && (
            <span className="pill bg-accent-soft text-accent-soft-fg">
              <BadgeCheck size={12} className="mr-1" />
              Partner
            </span>
          )}
          <span>
            {TYPE_LABELS[store.type]} · {store.suburb}
          </span>
          {store.rating && (
            <span className="inline-flex items-center gap-1 font-semibold text-fg">
              <Star size={14} className="fill-accent text-accent" />
              {store.rating.average.toFixed(1)} <span className="font-normal text-muted-fg">({store.rating.count})</span>
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <OpenLine hours={store.hours} />
        </div>
        {features.length > 0 && (
          <p className="mt-1 truncate text-sm text-muted-fg">
            Features: {features.join(" · ")}
            {store.features.length > 3 && " and more"}
          </p>
        )}
      </div>
    </Link>
  );
}

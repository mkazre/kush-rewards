// Discover (HANDOVER 4.1): area picker, search, filter chips, map, venues nearest first.
import { useQueryClient } from "@tanstack/react-query";
import { LocateFixed, Search, MapPinPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { distanceKm, openState, SUBURBS, TYPE_LABELS } from "@shared/lib/storeUtils";
import type { StoreType } from "@shared/types/api";
import { StoreCard } from "../components/StoreCard";
import { Empty, ErrorBox, Spinner } from "../components/ui";
import { VenueMap } from "../components/VenueMap";
import { usePrefs } from "../lib/prefs";
import { keys, useStores } from "../lib/queries";
import { LISTED_TYPES } from "../lib/site";

export default function Discover() {
  const { data: stores, isLoading, error } = useStores();
  const { location, setSuburb, locateMe, locating, locationError } = usePrefs();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [partners, setPartners] = useState(false);
  const [types, setTypes] = useState<StoreType[]>([]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (stores ?? [])
      .filter((s) => !needle || s.name.toLowerCase().includes(needle) || s.suburb.toLowerCase().includes(needle))
      .filter((s) => !openNow || openState(s.hours).isOpen === true)
      .filter((s) => !partners || s.isPartner)
      .filter((s) => !types.length || types.includes(s.type))
      .map((s) => ({ store: s, km: distanceKm(location, { lat: s.latitude, lng: s.longitude }) }))
      .sort((a, b) => a.km - b.km);
  }, [stores, q, openNow, partners, types, location]);

  const anyFilter = !!q || openNow || partners || types.length > 0;
  const clear = () => {
    setQ("");
    setOpenNow(false);
    setPartners(false);
    setTypes([]);
  };
  const toggleType = (t: StoreType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-secondary to-bg p-6 md:p-10">
        <h1 className="max-w-2xl text-3xl font-extrabold md:text-5xl">Find cannabis clubs and lounges near you</h1>
        <p className="mt-3 max-w-xl text-muted-fg md:text-lg">
          Venues in Roodepoort and the West Rand, with opening hours, features and honest reviews from locals. For adults 18+.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block sm:w-64">
            <span className="label text-muted-fg">Showing venues near</span>
            <select className="input" value={location.isGps ? "" : location.label} onChange={(e) => setSuburb(e.target.value)}>
              {location.isGps && <option value="">Your location</option>}
              {Object.keys(SUBURBS).sort().map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button className="btn-secondary" onClick={locateMe} disabled={locating}>
            <LocateFixed size={18} />
            {locating ? "Finding…" : "Near me"}
          </button>
          <label className="relative block flex-1">
            <span className="sr-only">Search</span>
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
            <input className="input pl-10" placeholder="Search by venue or suburb" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        {locationError && <p className="mt-2 text-sm text-error">{locationError}</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        <button className={`chip ${openNow ? "chip-on" : ""}`} onClick={() => setOpenNow(!openNow)}>Open now</button>
        <button className={`chip ${partners ? "chip-on" : ""}`} onClick={() => setPartners(!partners)}>Partners</button>
        {LISTED_TYPES.map((t) => (
          <button key={t} className={`chip ${types.includes(t) ? "chip-on" : ""}`} onClick={() => toggleType(t)}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {error && <ErrorBox error={error} />}
      {isLoading ? (
        <Spinner label="Finding venues…" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <VenueMap stores={filtered.map((f) => f.store)} you={location} height={420} />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {filtered.length} venue{filtered.length === 1 ? "" : "s"} near {location.label}
              </h2>
              <div className="flex gap-1">
                {anyFilter && <button className="btn-ghost py-1" onClick={clear}>Clear</button>}
                <button className="btn-ghost py-1" onClick={() => qc.invalidateQueries({ queryKey: keys.stores })}>Refresh</button>
              </div>
            </div>
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <Empty>{stores?.length ? "No venues match these filters." : "No venues are listed yet."}</Empty>
              ) : (
                filtered.map(({ store, km }) => <StoreCard key={store.id} store={store} km={km} />)
              )}
              <Link to="/suggest" className="card flex items-center gap-4 border-dashed p-5 transition hover:border-primary">
                <MapPinPlus className="shrink-0 text-primary" size={28} />
                <div>
                  <p className="font-bold">Know a venue that's missing?</p>
                  <p className="text-sm text-muted-fg">Suggest it and we'll check it and put it on the map.</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

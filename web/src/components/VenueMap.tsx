// Real map (Leaflet + OpenStreetMap tiles) with a pin per venue and a "you" dot.
// Partner pins are green, others grey. Click a pin to see the venue.
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, CircleMarker } from "react-leaflet";
import { useNavigate } from "react-router";
import { TYPE_LABELS } from "@shared/lib/storeUtils";
import type { PublicStore } from "@shared/types/api";
import { MAP_TILES } from "../lib/site";

function pin(partner: boolean) {
  const fill = partner ? "#1d6842" : "#6b7a70";
  return L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
    html: `<svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 36 14 36s14-12 14-22.3C28 6.1 21.7 0 14 0z" fill="${fill}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="5" fill="#fff"/></svg>`,
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export function VenueMap({ stores, you, height = 360 }: { stores: PublicStore[]; you?: { lat: number; lng: number }; height?: number }) {
  const navigate = useNavigate();
  const points: [number, number][] = stores.map((s) => [s.latitude, s.longitude]);
  if (you) points.push([you.lat, you.lng]);

  return (
    <div className="card overflow-hidden" style={{ height }}>
      <MapContainer center={[-26.14, 27.88]} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer url={MAP_TILES.url} attribution={MAP_TILES.attribution} />
        <FitBounds points={points} />
        {you && <CircleMarker center={[you.lat, you.lng]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2f71da", fillOpacity: 1 }} />}
        {stores.map((s) => (
          <Marker key={s.id} position={[s.latitude, s.longitude]} icon={pin(s.isPartner)}>
            <Popup>
              <button className="text-left" onClick={() => navigate(`/venue/${s.id}`)}>
                <strong className="block text-sm">{s.name}</strong>
                <span className="text-xs">
                  {TYPE_LABELS[s.type]} · {s.suburb}
                </span>
                <span className="mt-1 block text-xs font-semibold text-[#1d6842] underline">View venue</span>
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapBeerLog, Pub } from "@/lib/map-types";

const tripCenter: [number, number] = [49.25, 14.35];

function FitToPubs({ pubs }: { pubs: Pub[] }) {
  const map = useMap();

  useEffect(() => {
    if (pubs.length === 0) return;
    const bounds = L.latLngBounds(pubs.map((pub) => [pub.latitude, pub.longitude]));
    map.fitBounds(bounds, { padding: [28, 28] });
  }, [map, pubs]);

  return null;
}

export default function BeerMap({ pubs, logs }: { pubs: Pub[]; logs: MapBeerLog[] }) {
  return (
    <div className="h-[min(68vh,620px)] min-h-[420px] overflow-hidden rounded-xl border border-amber-700">
      <MapContainer center={tripCenter} zoom={8} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPubs pubs={pubs} />
        {pubs.map((pub) => {
          const pubLogs = logs.filter((log) => log.pub_id === pub.id);
          return (
            <Marker key={pub.id} position={[pub.latitude, pub.longitude]}>
              <Popup>
                <strong>{pub.name}</strong>
                <br />
                {pub.city}
                <br />
                {pubLogs.length} {pubLogs.length === 1 ? "beer" : "beers"} logged
                {pubLogs.length > 0 && (
                  <div className="mt-1">
                    {pubLogs.slice(0, 4).map((log) => (
                      <div key={log.id}>
                        {log.beer_name} · {"★".repeat(log.rating)}
                      </div>
                    ))}
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

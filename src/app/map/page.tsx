"use client";
export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { useEffect, useState } from "react";
import { Compass, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapBeerLog, Pub } from "@/lib/map-types";
import { TRIP_CITIES } from "@/lib/utils";

const BeerMap = dynamicImport(() => import("@/components/BeerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(68vh,620px)] min-h-[420px] items-center justify-center rounded-xl border border-amber-700 bg-amber-950/50 text-amber-400">
      Loading map...
    </div>
  ),
});

export default function MapPage() {
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [logs, setLogs] = useState<MapBeerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: pubData, error: pubError }, { data: logData, error: logError }] =
        await Promise.all([
          supabase.from("pubs").select("*").order("city").order("name"),
          supabase
            .from("beer_logs")
            .select("id, beer_name, rating, city, bar_name, pub_id, created_at, profiles(player_name)"),
        ]);

      if (pubError || logError) {
        setError(pubError?.message ?? logError?.message ?? "Could not load map data.");
      } else {
        setPubs((pubData as Pub[]) ?? []);
        setLogs((logData as MapBeerLog[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const visiblePubs = pubs.filter((pub) =>
    logs.some(
      (log) =>
        log.pub_id === pub.id ||
        (log.bar_name?.trim().toLowerCase() === pub.name.trim().toLowerCase() &&
          log.city?.trim().toLowerCase() === pub.city.trim().toLowerCase())
    )
  );
  const mappedBeers = logs.filter((log) => log.pub_id).length;
  const unmappedLogs = logs.filter((log) => !log.pub_id && log.city);
  const cityCounts = TRIP_CITIES.map((city) => ({
    city,
    pubs: visiblePubs.filter((pub) => pub.city === city).length,
  }));

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-700/70">
          <Compass size={21} className="text-amber-200" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-amber-100">Beer map</h1>
          <p className="text-sm text-amber-400">Where the beers were drunk</p>
        </div>
      </header>

      <Card className="bg-amber-900/60 border-amber-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-amber-100">Trip checkpoints</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {cityCounts.map(({ city, pubs: cityPubs }) => (
            <div key={city} className="flex items-center justify-between rounded-lg bg-amber-950/40 px-3 py-2">
              <span className="truncate text-sm text-amber-200">{city}</span>
              <Badge variant="outline" className="ml-2 shrink-0 border-amber-700 text-xs text-amber-400">
                {cityPubs} {cityPubs === 1 ? "pub" : "pubs"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          {error}. Run the optional map migration in Supabase first.
        </p>
      )}

      {!loading && visiblePubs.length === 0 && !error && (
        <div className="rounded-xl border border-amber-700 bg-amber-900/50 p-5 text-center text-sm text-amber-400">
          No pub checkpoints yet. Add the optional map migration and seed pubs in Supabase.
        </div>
      )}

      {!loading && unmappedLogs.length > 0 && (
        <div className="rounded-xl border border-amber-700 bg-amber-900/50 p-4 text-sm text-amber-300">
          <p className="font-medium text-amber-100">
            {unmappedLogs.length} beer {unmappedLogs.length === 1 ? "log has" : "logs have"} no map checkpoint yet.
          </p>
          <p className="mt-1 text-xs text-amber-500">
            A bar name alone cannot create a marker. When logging a beer, search for the bar and select the correct map result before saving.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...new Set(unmappedLogs.map((log) => `${log.bar_name ?? "Unnamed pub"} · ${log.city}`))]
              .slice(0, 5)
              .map((label) => (
                <span key={label} className="rounded-md bg-amber-950/60 px-2 py-1 text-xs text-amber-400">
                  {label}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="relative">
        {!loading && visiblePubs.length > 0 && <BeerMap pubs={visiblePubs} logs={logs} />}
        {loading && (
          <div className="flex h-[min(68vh,620px)] min-h-[420px] items-center justify-center rounded-xl border border-amber-700 bg-amber-950/50 text-amber-400">
            Loading map...
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-amber-950/90 px-3 py-2 text-xs text-amber-300 shadow-lg">
          <MapPin size={14} className="mr-1 inline-block" />
          {mappedBeers} mapped {mappedBeers === 1 ? "beer" : "beers"}
        </div>
      </div>
    </div>
  );
}

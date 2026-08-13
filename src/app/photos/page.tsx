"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TRIP_CITIES } from "@/lib/utils";

type PhotoLog = {
  id: string;
  beer_name: string;
  brewery: string | null;
  rating: number;
  city: string | null;
  bar_name: string | null;
  photo_url: string;
  created_at: string;
  profiles?: { player_name: string } | { player_name: string }[] | null;
};

function playerName(log: PhotoLog) {
  return Array.isArray(log.profiles)
    ? log.profiles[0]?.player_name ?? "Unknown player"
    : log.profiles?.player_name ?? "Unknown player";
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<PhotoLog[]>([]);
  const [playerFilter, setPlayerFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("beer_logs")
        .select("id, beer_name, brewery, rating, city, bar_name, photo_url, created_at, profiles(player_name)")
        .not("photo_url", "is", null)
        .order("created_at", { ascending: false });
      if (queryError) setError(queryError.message);
      setPhotos((data as PhotoLog[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const players = useMemo(
    () => [...new Set(photos.map(playerName))].sort(),
    [photos]
  );
  const filteredPhotos = photos.filter((photo) => {
    return (
      (!playerFilter || playerName(photo) === playerFilter) &&
      (!cityFilter || photo.city === cityFilter) &&
      (!ratingFilter || ratingFilter === "0" || photo.rating >= Number(ratingFilter))
    );
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-700/70">
          <Camera size={21} className="text-amber-200" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-amber-100">Beer photo wall</h1>
          <p className="text-sm text-amber-400">The trip, one pour at a time</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} className="h-10 rounded-md border border-amber-700 bg-amber-900/60 px-3 text-sm text-amber-100">
          <option value="">All players</option>
          {players.map((player) => <option key={player} value={player}>{player}</option>)}
        </select>
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="h-10 rounded-md border border-amber-700 bg-amber-900/60 px-3 text-sm text-amber-100">
          <option value="">All cities</option>
          {TRIP_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="h-10 rounded-md border border-amber-700 bg-amber-900/60 px-3 text-sm text-amber-100">
          <option value="0">Any rating</option>
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}+ stars</option>)}
        </select>
      </div>

      {error && <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
      {loading && <p className="py-10 text-center text-amber-400">Loading photos...</p>}
      {!loading && filteredPhotos.length === 0 && (
        <div className="rounded-xl border border-amber-700 bg-amber-900/50 p-10 text-center text-amber-400">
          <ImageIcon className="mx-auto mb-3" size={32} />
          No photos match these filters yet.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filteredPhotos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden border-amber-700 bg-amber-900/60">
            <img src={photo.photo_url} alt={`${photo.beer_name} logged by ${playerName(photo)}`} className="aspect-square w-full object-cover" loading="lazy" />
            <CardContent className="p-3">
              <p className="truncate text-sm font-semibold text-amber-100">{photo.beer_name}</p>
              <p className="truncate text-xs text-amber-400">{playerName(photo)}</p>
              <p className="mt-1 text-xs text-amber-300">{"★".repeat(photo.rating)}</p>
              <p className="truncate text-xs text-amber-500">{photo.bar_name ?? photo.city ?? "Unknown place"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

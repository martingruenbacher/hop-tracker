"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Download, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [sortBy, setSortBy] = useState<"newest" | "rating" | "player">("newest");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
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
  const filteredPhotos = useMemo(() => {
    const matches = photos.filter((photo) => {
      return (
        (!playerFilter || playerName(photo) === playerFilter) &&
        (!cityFilter || photo.city === cityFilter) &&
        (!ratingFilter || ratingFilter === "0" || photo.rating >= Number(ratingFilter))
      );
    });

    return [...matches].sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "player") return playerName(a).localeCompare(playerName(b));
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [photos, playerFilter, cityFilter, ratingFilter, sortBy]);

  const selectedPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] ?? null : null;

  const openPhoto = (index: number) => setSelectedPhotoIndex(index);
  const showPreviousPhoto = () => {
    if (selectedPhotoIndex === null || filteredPhotos.length === 0) return;
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
  };
  const showNextPhoto = () => {
    if (selectedPhotoIndex === null || filteredPhotos.length === 0) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % filteredPhotos.length);
  };

  async function downloadPhoto(url: string, title: string) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${(title || "beer-photo").replace(/\s+/g, "-").toLowerCase()}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const fallback = document.createElement("a");
      fallback.href = url;
      fallback.download = `${(title || "beer-photo").replace(/\s+/g, "-").toLowerCase()}.jpg`;
      fallback.target = "_blank";
      fallback.rel = "noopener noreferrer";
      document.body.appendChild(fallback);
      fallback.click();
      document.body.removeChild(fallback);
    }
  }

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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
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
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "rating" | "player")} className="h-10 rounded-md border border-amber-700 bg-amber-900/60 px-3 text-sm text-amber-100">
          <option value="newest">Newest first</option>
          <option value="rating">Highest rating</option>
          <option value="player">By player</option>
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
        {filteredPhotos.map((photo, index) => (
          <Card key={photo.id} className="overflow-hidden border-amber-700 bg-amber-900/60">
            <button
              type="button"
              onClick={() => openPhoto(index)}
              aria-label={`Open ${photo.beer_name} photo from ${playerName(photo)}`}
              className="group block w-full text-left"
            >
              <img src={photo.photo_url} alt={`${photo.beer_name} logged by ${playerName(photo)}`} className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" loading="lazy" />
            </button>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-amber-100">{photo.beer_name}</p>
                  <p className="truncate text-xs text-amber-400">{playerName(photo)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void downloadPhoto(photo.photo_url, photo.beer_name)}
                  className="inline-flex items-center justify-center rounded-md border border-amber-600 bg-amber-800/80 px-2 py-1 text-[10px] font-medium text-amber-100 transition-colors hover:bg-amber-700"
                  aria-label={`Download ${photo.beer_name} photo`}
                >
                  <Download size={12} className="mr-1" />
                  Download
                </button>
              </div>
              <p className="mt-1 text-xs text-amber-300">{"★".repeat(photo.rating)}</p>
              <p className="truncate text-xs text-amber-500">{photo.bar_name ?? photo.city ?? "Unknown place"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={selectedPhoto !== null} onOpenChange={(open) => !open && setSelectedPhotoIndex(null)}>
        {selectedPhoto && (
          <DialogContent className="max-w-4xl border border-amber-700 bg-amber-950/95 p-0 text-amber-100 sm:max-w-5xl">
            <div className="relative">
              <button
                type="button"
                onClick={showPreviousPhoto}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-amber-600 bg-amber-900/80 p-2 text-amber-100 shadow-lg transition hover:bg-amber-800"
                aria-label="Previous photo"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={showNextPhoto}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-amber-600 bg-amber-900/80 p-2 text-amber-100 shadow-lg transition hover:bg-amber-800"
                aria-label="Next photo"
              >
                <ChevronRight size={18} />
              </button>

              <div className="max-h-[80vh] overflow-hidden bg-black">
                <img src={selectedPhoto.photo_url} alt={`${selectedPhoto.beer_name} logged by ${playerName(selectedPhoto)}`} className="max-h-[80vh] w-full object-contain" />
              </div>
            </div>

            <div className="border-t border-amber-700 bg-amber-950/90 p-4">
              <DialogHeader className="mb-3">
                <DialogTitle className="text-amber-100">{selectedPhoto.beer_name}</DialogTitle>
                <DialogDescription className="text-amber-300">
                  {playerName(selectedPhoto)} • {selectedPhoto.city ?? "Unknown city"} • {"★".repeat(selectedPhoto.rating)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-amber-400">
                  {selectedPhoto.bar_name ?? "Unknown bar"}
                </div>
                <button
                  type="button"
                  onClick={() => void downloadPhoto(selectedPhoto.photo_url, selectedPhoto.beer_name)}
                  className="inline-flex items-center gap-2 rounded-md border border-amber-600 bg-amber-800/80 px-3 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-700"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

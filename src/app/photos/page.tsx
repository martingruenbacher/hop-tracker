"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Download, Image as ImageIcon, MessageCircle, Send, Share2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { processBeerLog } from "@/lib/process-beer-log";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, TRIP_CITIES } from "@/lib/utils";

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

type GroupLog = {
  id: string;
  user_id: string;
  rating: number;
  city: string | null;
  bar_name: string | null;
  profiles?: { player_name: string } | { player_name: string }[] | null;
};

type ReactionKey = "cheers" | "love" | "must_try";
type ReactionCounts = Record<ReactionKey, number>;
type PhotoReaction = {
  beer_log_id: string;
  user_id: string;
  reaction: ReactionKey;
};
type PhotoComment = {
  id: string;
  beer_log_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: { player_name: string } | { player_name: string }[] | null;
};

const REACTIONS: { key: ReactionKey; label: string; icon: string }[] = [
  { key: "cheers", label: "Cheers", icon: "🍺" },
  { key: "love", label: "Love it", icon: "❤️" },
  { key: "must_try", label: "Must try", icon: "🔥" },
];

const emptyReactionCounts = (): ReactionCounts => ({
  cheers: 0,
  love: 0,
  must_try: 0,
});

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function playerName(log: PhotoLog) {
  return Array.isArray(log.profiles)
    ? log.profiles[0]?.player_name ?? "Unknown player"
    : log.profiles?.player_name ?? "Unknown player";
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<PhotoLog[]>([]);
  const [groupLogs, setGroupLogs] = useState<GroupLog[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, ReactionCounts>>({});
  const [comments, setComments] = useState<Record<string, PhotoComment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [myReactions, setMyReactions] = useState<Record<string, ReactionKey>>({});
  const [playerFilter, setPlayerFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("0");
  const [sortBy, setSortBy] = useState<"newest" | "rating" | "player">("newest");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [achievementNotice, setAchievementNotice] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: userData }, { data, error: queryError }, { data: allLogs, error: groupError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("beer_logs")
          .select("id, beer_name, brewery, rating, city, bar_name, photo_url, created_at, profiles(player_name)")
          .not("photo_url", "is", null)
          .order("created_at", { ascending: false }),
          supabase
            .from("beer_logs")
            .select("id, user_id, rating, city, bar_name, profiles(player_name)")
            .order("created_at", { ascending: false }),
      ]);
      if (queryError) setError(queryError.message);
          if (groupError) setError(groupError.message);
      setPhotos((data as PhotoLog[]) ?? []);
          setGroupLogs((allLogs as GroupLog[]) ?? []);

      const photoIds = (data ?? []).map((photo) => photo.id);
      if (photoIds.length > 0) {
        const { data: reactions, error: reactionError } = await supabase
          .from("photo_reactions")
          .select("beer_log_id, user_id, reaction")
          .in("beer_log_id", photoIds);
        if (reactionError) {
          setError(reactionError.message);
        } else {
          const counts: Record<string, ReactionCounts> = {};
          const mine: Record<string, ReactionKey> = {};
          (reactions as PhotoReaction[]).forEach((reaction) => {
            const current = counts[reaction.beer_log_id] ?? emptyReactionCounts();
            current[reaction.reaction] += 1;
            counts[reaction.beer_log_id] = current;
            if (reaction.user_id === userData.user?.id) {
              mine[reaction.beer_log_id] = reaction.reaction;
            }
          });
          setReactionCounts(counts);
          setMyReactions(mine);
        }
      }
      if (photoIds.length > 0) {
        const { data: commentData, error: commentError } = await supabase
          .from("photo_comments")
          .select("id, beer_log_id, user_id, comment, created_at, profiles(player_name)")
          .in("beer_log_id", photoIds)
          .order("created_at", { ascending: true });
        if (commentError) {
          setError(commentError.message);
        } else {
          const grouped: Record<string, PhotoComment[]> = {};
          (commentData as PhotoComment[]).forEach((comment) => {
            grouped[comment.beer_log_id] = [...(grouped[comment.beer_log_id] ?? []), comment];
          });
          setComments(grouped);
        }
      }
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

  const photoOfTheDay = useMemo(() => {
    const today = localDateKey(new Date());
    return photos
      .filter((photo) => localDateKey(new Date(photo.created_at)) === today)
      .sort((a, b) => {
        const aCounts = reactionCounts[a.id] ?? emptyReactionCounts();
        const bCounts = reactionCounts[b.id] ?? emptyReactionCounts();
        const reactionDifference =
          Object.values(bCounts).reduce((sum, count) => sum + count, 0) -
          Object.values(aCounts).reduce((sum, count) => sum + count, 0);
        if (reactionDifference !== 0) return reactionDifference;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })[0] ?? null;
  }, [photos, reactionCounts]);
  const photoOfTheDayReactions = photoOfTheDay
    ? Object.values(reactionCounts[photoOfTheDay.id] ?? emptyReactionCounts()).reduce(
        (sum, count) => sum + count,
        0
      )
    : 0;
  const photoOfTheDayIndex = photoOfTheDay
    ? filteredPhotos.findIndex((photo) => photo.id === photoOfTheDay.id)
    : -1;
  const groupStats = useMemo(() => {
    const cityCounts = new Map<string, number>();
    groupLogs.forEach((log) => {
      if (log.city) cityCounts.set(log.city, (cityCounts.get(log.city) ?? 0) + 1);
    });
    const topCity = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No city yet";
    return {
      beers: groupLogs.length,
      average: groupLogs.length
        ? (groupLogs.reduce((sum, log) => sum + log.rating, 0) / groupLogs.length).toFixed(1)
        : "—",
      pubs: new Set(groupLogs.map((log) => log.bar_name?.trim().toLowerCase()).filter(Boolean)).size,
      players: new Set(groupLogs.map((log) => log.user_id)).size,
      topCity,
    };
  }, [groupLogs]);

  const selectedPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] ?? null : null;
  const selectedPhotoComments = selectedPhoto ? comments[selectedPhoto.id] ?? [] : [];

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

  function downloadBlob(blob: Blob, filename: string) {
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  }

  async function exportPhotoOfTheDay() {
    if (!photoOfTheDay) return;

    setError("");
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Could not create the export image.");
      return;
    }

    const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, "#451a03");
    background.addColorStop(1, "#78350f");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const imageX = 60;
    const imageY = 60;
    const imageWidth = 720;
    const imageHeight = 880;
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = photoOfTheDay.photo_url;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Photo could not be loaded"));
      });
      const scale = Math.max(imageWidth / image.width, imageHeight / image.height);
      const sourceWidth = imageWidth / scale;
      const sourceHeight = imageHeight / scale;
      context.drawImage(
        image,
        (image.width - sourceWidth) / 2,
        (image.height - sourceHeight) / 2,
        sourceWidth,
        sourceHeight,
        imageX,
        imageY,
        imageWidth,
        imageHeight
      );
    } catch {
      context.fillStyle = "#92400e";
      context.fillRect(imageX, imageY, imageWidth, imageHeight);
      context.fillStyle = "#fde68a";
      context.font = "600 32px Geist, sans-serif";
      context.fillText("Photo unavailable", imageX + 210, imageY + imageHeight / 2);
    }

    context.fillStyle = "rgba(28, 14, 4, 0.78)";
    context.fillRect(840, 60, 700, 880);
    context.fillStyle = "#fcd34d";
    context.font = "700 34px Geist, sans-serif";
    context.fillText("PHOTO OF THE DAY", 900, 135);
    context.fillStyle = "#fffbeb";
    context.font = "700 58px Geist, sans-serif";
    context.fillText(photoOfTheDay.beer_name.slice(0, 22), 900, 220);
    context.fillStyle = "#fbbf24";
    context.font = "400 28px Geist, sans-serif";
    context.fillText(`${playerName(photoOfTheDay)} · ${photoOfTheDay.city ?? "Unknown city"}`, 900, 275);
    context.fillText(photoOfTheDay.bar_name ?? "Unknown place", 900, 320);

    context.fillStyle = "#fef3c7";
    context.font = "700 34px Geist, sans-serif";
    context.fillText(`${"★".repeat(photoOfTheDay.rating)}  ·  ${photoOfTheDayReactions} reactions`, 900, 400);
    context.fillStyle = "#fcd34d";
    context.font = "700 28px Geist, sans-serif";
    context.fillText("GROUP RECAP", 900, 510);
    context.fillStyle = "#fffbeb";
    context.font = "500 30px Geist, sans-serif";
    const statLines = [
      `${groupStats.beers} beers logged`,
      `${groupStats.average} average rating`,
      `${groupStats.pubs} pubs visited`,
      `${groupStats.players} players playing`,
      `Top city: ${groupStats.topCity}`,
    ];
    statLines.forEach((line, index) => context.fillText(line, 900, 570 + index * 52));
    context.fillStyle = "#f59e0b";
    context.font = "400 22px Geist, sans-serif";
    context.fillText("Hop Tracker · Czech Republic 2026", 900, 885);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      setError("Could not create the export image.");
      return;
    }

    const filename = `hop-tracker-photo-of-the-day-${localDateKey(new Date())}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Hop Tracker Photo of the Day",
          text: `${photoOfTheDay.beer_name} · Photo of the Day`,
        });
      } else {
        downloadBlob(blob, filename);
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      downloadBlob(blob, filename);
    }
  }

  async function toggleReaction(photoId: string, reaction: ReactionKey) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setError("Sign in to react to photos.");
      return;
    }

    const previousReaction = myReactions[photoId];
    const nextReaction = previousReaction === reaction ? undefined : reaction;
    const previousCounts = reactionCounts[photoId] ?? emptyReactionCounts();
    const nextCounts = { ...previousCounts };
    if (previousReaction) nextCounts[previousReaction] = Math.max(0, nextCounts[previousReaction] - 1);
    if (nextReaction) nextCounts[nextReaction] += 1;

    setReactionCounts((current) => ({ ...current, [photoId]: nextCounts }));
    setMyReactions((current) => {
      const updated = { ...current };
      if (nextReaction) updated[photoId] = nextReaction;
      else delete updated[photoId];
      return updated;
    });

    const { error: deleteError } = await supabase
      .from("photo_reactions")
      .delete()
      .eq("beer_log_id", photoId)
      .eq("user_id", userId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (nextReaction) {
      const { error: insertError } = await supabase.from("photo_reactions").insert({
        beer_log_id: photoId,
        user_id: userId,
        reaction: nextReaction,
      });
      if (insertError) setError(insertError.message);
    }

    const newAchievements = await processBeerLog(supabase, userId);
    if (newAchievements.length > 0) {
      setAchievementNotice(newAchievements);
      window.setTimeout(() => setAchievementNotice([]), 6000);
    }
  }

  async function submitComment() {
    if (!selectedPhoto || !commentDraft.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    setError("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setError("Sign in to comment on photos.");
      setCommentSubmitting(false);
      return;
    }

    const { data, error: commentError } = await supabase
      .from("photo_comments")
      .insert({
        beer_log_id: selectedPhoto.id,
        user_id: userId,
        comment: commentDraft.trim(),
      })
      .select("id, beer_log_id, user_id, comment, created_at, profiles(player_name)")
      .single();

    if (commentError || !data) {
      setError(commentError?.message ?? "Could not add the comment.");
    } else {
      setComments((current) => ({
        ...current,
        [selectedPhoto.id]: [...(current[selectedPhoto.id] ?? []), data as PhotoComment],
      }));
      setCommentDraft("");
    }
    setCommentSubmitting(false);
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
      {achievementNotice.length > 0 && (
        <div className="rounded-lg border border-amber-400 bg-amber-800/80 p-4 text-amber-100 shadow-lg">
          <p className="font-semibold">Achievement unlocked!</p>
          {achievementNotice.map((achievement) => (
            <p key={achievement} className="mt-1 text-sm text-amber-200">{achievement}</p>
          ))}
        </div>
      )}
      {loading && <p className="py-10 text-center text-amber-400">Loading photos...</p>}
      {!loading && photoOfTheDay && (
        <Card className="overflow-hidden border-amber-500 bg-amber-800/60">
          <div className="grid gap-0 sm:grid-cols-[minmax(0,220px)_1fr]">
            <button
              type="button"
              onClick={() => photoOfTheDayIndex >= 0 && openPhoto(photoOfTheDayIndex)}
              disabled={photoOfTheDayIndex < 0}
              className="group relative block aspect-square w-full overflow-hidden text-left disabled:cursor-default"
              aria-label={`Open photo of the day: ${photoOfTheDay.beer_name}`}
            >
              <img
                src={photoOfTheDay.photo_url}
                alt={`${photoOfTheDay.beer_name} photo of the day`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-950/90 px-2.5 py-1 text-xs font-semibold text-amber-200">
                <Trophy size={13} />
                Photo of the day
              </span>
            </button>
            <CardContent className="flex flex-col justify-center p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Today&apos;s winner</p>
              <h2 className="mt-1 truncate text-xl font-bold text-amber-100">{photoOfTheDay.beer_name}</h2>
              <p className="mt-1 text-sm text-amber-300">
                {playerName(photoOfTheDay)} · {photoOfTheDay.bar_name ?? photoOfTheDay.city ?? "Unknown place"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-amber-200">
                <span>{"★".repeat(photoOfTheDay.rating)}</span>
                <span className="text-amber-500">·</span>
                <span>{photoOfTheDayReactions} {photoOfTheDayReactions === 1 ? "reaction" : "reactions"}</span>
              </div>
              <p className="mt-3 text-xs text-amber-400">
                {photoOfTheDayReactions > 0
                  ? "The crew has chosen today's favorite shot."
                  : "Be the first to react and set today&apos;s bar."}
              </p>
              <button
                type="button"
                onClick={() => void exportPhotoOfTheDay()}
                className="mt-4 inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-amber-500 bg-amber-700 px-3 py-2 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-600"
              >
                <Share2 size={15} />
                Export for sharing
              </button>
            </CardContent>
          </div>
        </Card>
      )}
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
              <button
                type="button"
                onClick={() => {
                  const photoIndex = filteredPhotos.findIndex((item) => item.id === photo.id);
                  if (photoIndex >= 0) openPhoto(photoIndex);
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-100"
                aria-label={`View comments for ${photo.beer_name}`}
              >
                <MessageCircle size={13} />
                {comments[photo.id]?.length ?? 0} {comments[photo.id]?.length === 1 ? "comment" : "comments"}
              </button>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-amber-800/70 pt-2">
                {REACTIONS.map((reaction) => {
                  const counts = reactionCounts[photo.id] ?? emptyReactionCounts();
                  const active = myReactions[photo.id] === reaction.key;
                  return (
                    <button
                      key={reaction.key}
                      type="button"
                      onClick={() => void toggleReaction(photo.id, reaction.key)}
                      aria-pressed={active}
                      aria-label={`${reaction.label}: ${counts[reaction.key]}`}
                      className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                        active
                          ? "border-amber-300 bg-amber-700 text-amber-50"
                          : "border-amber-800 bg-amber-950/50 text-amber-400 hover:border-amber-600 hover:text-amber-200"
                      }`}
                    >
                      <span aria-hidden="true">{reaction.icon}</span>
                      <span>{counts[reaction.key]}</span>
                    </button>
                  );
                })}
              </div>
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
              <div className="mt-4 flex flex-wrap gap-2 border-t border-amber-800/70 pt-3">
                {REACTIONS.map((reaction) => {
                  const counts = reactionCounts[selectedPhoto.id] ?? emptyReactionCounts();
                  const active = myReactions[selectedPhoto.id] === reaction.key;
                  return (
                    <button
                      key={reaction.key}
                      type="button"
                      onClick={() => void toggleReaction(selectedPhoto.id, reaction.key)}
                      aria-pressed={active}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-amber-300 bg-amber-700 text-amber-50"
                          : "border-amber-800 bg-amber-950/50 text-amber-400 hover:border-amber-600 hover:text-amber-200"
                      }`}
                    >
                      <span aria-hidden="true">{reaction.icon}</span>
                      {reaction.label} {counts[reaction.key]}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-amber-800/70 pt-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-100">
                  <MessageCircle size={15} />
                  Comments ({selectedPhotoComments.length})
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {selectedPhotoComments.length === 0 ? (
                    <p className="text-xs text-amber-500">No comments yet. Start the conversation.</p>
                  ) : (
                    selectedPhotoComments.map((comment) => (
                      <div key={comment.id} className="rounded-md bg-amber-950/50 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-amber-200">
                            {Array.isArray(comment.profiles)
                              ? comment.profiles[0]?.player_name ?? "Unknown player"
                              : comment.profiles?.player_name ?? "Unknown player"}
                          </span>
                          <span className="text-[10px] text-amber-600">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="mt-1 break-words text-sm text-amber-300">{comment.comment}</p>
                      </div>
                    ))
                  )}
                </div>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitComment();
                  }}
                >
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value.slice(0, 500))}
                    placeholder="Write a comment..."
                    maxLength={500}
                    className="min-w-0 flex-1 rounded-md border border-amber-700 bg-amber-900/60 px-3 py-2 text-sm text-amber-100 placeholder:text-amber-600"
                    aria-label="Comment on photo"
                  />
                  <button
                    type="submit"
                    disabled={!commentDraft.trim() || commentSubmitting}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-700 text-amber-100 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Post comment"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

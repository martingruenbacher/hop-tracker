"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BeerLog } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type TimelineLog = BeerLog & {
  profiles?: { player_name: string; avatar_url: string | null } | null;
};

export default function TimelinePage() {
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timelineDay, setTimelineDay] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("beer_logs")
        .select("*, profiles(player_name, avatar_url)")
        .order("created_at", { ascending: true });

      if (queryError) setError(queryError.message);
      setLogs((data as TimelineLog[]) ?? []);
      setLoading(false);
    }

    load();
  }, []);

  const timelineLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [logs]
  );
  const timelineStart = timelineLogs.length
    ? new Date(new Date(timelineLogs[0].created_at).setHours(0, 0, 0, 0))
    : new Date(new Date().setHours(0, 0, 0, 0));
  const timelineEnd = timelineLogs.length
    ? new Date(new Date(timelineLogs[timelineLogs.length - 1].created_at).setHours(0, 0, 0, 0))
    : timelineStart;
  const timelineDayCount = Math.max(
    1,
    Math.floor((timelineEnd.getTime() - timelineStart.getTime()) / 86_400_000) + 1
  );
  const safeTimelineDay = Math.min(timelineDay, timelineDayCount - 1);
  const selectedTimelineDate = new Date(timelineStart.getTime() + safeTimelineDay * 86_400_000);
  const selectedTimelineLogs = timelineLogs.filter((log) => {
    const logDate = new Date(log.created_at);
    return (
      logDate.getFullYear() === selectedTimelineDate.getFullYear() &&
      logDate.getMonth() === selectedTimelineDate.getMonth() &&
      logDate.getDate() === selectedTimelineDate.getDate()
    );
  });
  const selectedTimelineCity = selectedTimelineLogs.find((log) => log.city)?.city;
  const selectedDateLabel = selectedTimelineDate.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  function moveTimelineDay(offset: number) {
    setTimelineDay((currentDay) =>
      Math.max(0, Math.min(timelineDayCount - 1, currentDay + offset))
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-700/70">
          <Clock3 size={21} className="text-amber-200" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-amber-100 sm:text-2xl">Trip timeline</h1>
          <p className="text-xs text-amber-400 sm:text-sm">Replay the crew&apos;s beers, photos, and city stops</p>
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
      {loading && <p className="py-10 text-center text-amber-400">Loading timeline...</p>}

      {!loading && (
        <Card className="border-amber-700 bg-amber-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-100">The trip, day by day</CardTitle>
            <p className="text-xs text-amber-500">Swipe the slider or use the day buttons.</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => moveTimelineDay(-1)}
                  disabled={safeTimelineDay === 0}
                  aria-label="Previous timeline day"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-700 text-amber-200 transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0 text-center">
                  <p className="truncate text-sm font-semibold text-amber-100">
                    Day {safeTimelineDay + 1} of {timelineDayCount}
                  </p>
                  <p className="truncate text-xs text-amber-400">
                    {selectedDateLabel}{selectedTimelineCity ? ` · ${selectedTimelineCity}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => moveTimelineDay(1)}
                  disabled={safeTimelineDay === timelineDayCount - 1}
                  aria-label="Next timeline day"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-700 text-amber-200 transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={timelineDayCount - 1}
                step={1}
                value={safeTimelineDay}
                onChange={(event) => setTimelineDay(Number(event.target.value))}
                aria-label="Trip timeline day"
                className="mt-4 h-4 w-full cursor-pointer accent-amber-400"
              />
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-amber-600">
                <span>{timelineStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                <span>{selectedTimelineLogs.length} {selectedTimelineLogs.length === 1 ? "beer" : "beers"}</span>
                <span>{timelineEnd.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {selectedTimelineLogs.length === 0 ? (
                <div className="rounded-lg bg-amber-950/40 p-6 text-center text-sm text-amber-500">
                  <ImageIcon className="mx-auto mb-2" size={24} />
                  No beers were logged on this day.
                </div>
              ) : (
                selectedTimelineLogs.map((log) => (
                  <div key={log.id} className="flex min-w-0 items-start gap-2 rounded-lg bg-amber-950/40 p-3 sm:items-center sm:gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-700 text-sm">
                      {log.profiles?.avatar_url ? (
                        <img src={log.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : log.photo_url ? "📸" : "🍺"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-amber-100">
                        {log.profiles?.player_name ?? "Someone"} · {log.beer_name}
                      </p>
                      <p className="truncate text-xs text-amber-500">
                        {log.bar_name ?? log.city ?? "Unknown place"} · {formatDate(log.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="max-w-[5rem] shrink-0 truncate border-amber-700 text-[10px] text-amber-300 sm:max-w-none sm:text-xs">
                      {"★".repeat(log.rating)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
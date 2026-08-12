"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BeerLog, Profile } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface PlayerStats {
  profile: Profile;
  total: number;
  avg: number;
  unique: number;
  cities: number;
  achievements: number;
}

const categories = [
  { key: "total", label: "Most Beers", icon: "🍺", valueKey: "total", unit: "beers" },
  { key: "avg", label: "Highest Avg", icon: "⭐", valueKey: "avg", unit: "avg ★" },
  { key: "unique", label: "Variety", icon: "🌈", valueKey: "unique", unit: "unique beers" },
  { key: "achievements", label: "Achievements", icon: "🏆", valueKey: "achievements", unit: "achievements" },
] as const;

type CategoryKey = (typeof categories)[number]["key"];

export default function LeaderboardPage() {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CategoryKey>("total");

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ data: profiles }, { data: logs }, { data: achievements }] =
        await Promise.all([
          supabase.from("profiles").select("*"),
          supabase
            .from("beer_logs")
            .select("user_id, beer_name, rating, city, created_at"),
          supabase.from("achievements").select("user_id"),
        ]);

      if (!profiles) return;

      const playerStats: PlayerStats[] = profiles.map((p: Profile) => {
        const myLogs = (logs ?? []).filter(
          (l: Partial<BeerLog>) => l.user_id === p.id
        );
        const myAchievements = (achievements ?? []).filter(
          (a: { user_id: string }) => a.user_id === p.id
        );
        return {
          profile: p,
          total: myLogs.length,
          avg:
            myLogs.length > 0
              ? myLogs.reduce(
                  (s: number, l: Partial<BeerLog>) => s + (l.rating ?? 0),
                  0
                ) / myLogs.length
              : 0,
          unique: new Set(
            myLogs.map((l: Partial<BeerLog>) => l.beer_name?.toLowerCase())
          ).size,
          cities: new Set(
            myLogs.map((l: Partial<BeerLog>) => l.city).filter(Boolean)
          ).size,
          achievements: myAchievements.length,
        };
      });

      setStats(playerStats);
      setLoading(false);
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-amber-400">
        Loading...
      </div>
    );

  const medals = ["🥇", "🥈", "🥉"];
  const selectedCategory = categories.find((item) => item.key === category)!;

  function RankList({
    sorted,
    valueKey,
    unit,
  }: {
    sorted: PlayerStats[];
    valueKey: keyof PlayerStats;
    unit: string;
  }) {
    return (
      <div className="w-full min-w-0 space-y-3">
        {sorted.map((s, i) => (
          <Card
            key={s.profile.id}
            className={`w-full min-w-0 overflow-hidden border ${
              i === 0
                ? "border-amber-400 bg-amber-800/60"
                : "border-amber-700 bg-amber-900/40"
            }`}
          >
            <CardContent className="min-w-0 p-3 sm:p-4 flex items-start sm:items-center gap-2 sm:gap-4">
              <span className="text-xl sm:text-2xl w-7 sm:w-8 text-center shrink-0 pt-1 sm:pt-0">
                {medals[i] ?? `#${i + 1}`}
              </span>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-700 flex items-center justify-center overflow-hidden shrink-0">
                {s.profile.avatar_url ? (
                  <img
                    src={s.profile.avatar_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">🍺</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-100 truncate">
                  {s.profile.player_name}
                </p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs border-amber-700 text-amber-400 px-1.5"
                  >
                    🍺 {s.total} beers
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs border-amber-700 text-amber-400 px-1.5"
                  >
                    ⭐ {s.avg.toFixed(1)} avg
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs border-amber-700 text-amber-400 px-1.5"
                  >
                    🏆 {s.achievements}
                  </Badge>
                </div>
              </div>
              <div className="max-w-[4.5rem] text-right shrink-0 pt-1 sm:pt-0">
                <p className="text-xl sm:text-2xl font-bold text-amber-300">
                {typeof s[valueKey] === "number"
                  ? (s[valueKey] as number).toFixed(valueKey === "avg" ? 1 : 0)
                  : String(s[valueKey])}
                </p>
                <p className="text-xs text-amber-500">{unit}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {sorted.length === 0 && (
          <p className="text-amber-500 text-sm text-center py-8">
            No data yet — log some beers!
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-700/70">
          <Trophy size={21} className="text-amber-200" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-amber-100">Leaderboard</h1>
          <p className="text-sm text-amber-400">Who&apos;s winning?</p>
        </div>
      </header>

      <section className="w-full min-w-0 rounded-xl border border-amber-700 bg-amber-900/50 p-2 sm:p-3">
        <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wide text-amber-500">
          Rank by
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {categories.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
              aria-pressed={category === item.key}
              className={`min-w-0 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                category === item.key
                  ? "bg-amber-600 text-amber-50"
                  : "text-amber-300 hover:bg-amber-800 hover:text-amber-100"
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              <span className="break-words">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-amber-100">
              {selectedCategory.icon} {selectedCategory.label}
            </h2>
            <p className="text-xs text-amber-500">{stats.length} players</p>
          </div>
          <span className="shrink-0 text-xs text-amber-500">{selectedCategory.unit}</span>
        </div>
        <RankList
          sorted={[...stats]
            .filter((s) => category !== "avg" || s.total > 0)
            .sort((a, b) => (b[category] as number) - (a[category] as number))}
          valueKey={selectedCategory.valueKey}
          unit={selectedCategory.unit}
        />
      </section>
    </div>
  );
}

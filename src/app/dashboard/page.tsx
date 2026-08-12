"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BeerLog, Profile } from "@/lib/types";
import { formatDate, TRIP_CITIES } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Beer, Star, MapPin, Trophy, Share2 } from "lucide-react";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/achievements";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<BeerLog[]>([]);
  const [allLogs, setAllLogs] = useState<BeerLog[]>([]);
  const [unlockedKeys, setUnlockedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: prof }, { data: myLogs }, { data: achiev }, { data: everyone }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase
            .from("beer_logs")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("achievements")
            .select("achievement_key")
            .eq("user_id", user.id),
          supabase
            .from("beer_logs")
            .select("*, profiles(player_name, avatar_url)")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      if (!prof) {
        window.location.href = "/profile?setup=1";
        return;
      }
      setProfile(prof);
      setLogs(myLogs ?? []);
      setAllLogs(everyone ?? []);
      setUnlockedKeys(achiev?.map((a) => a.achievement_key) ?? []);
      setLoading(false);
    }

    const channel = supabase
      .channel(`dashboard-beer-activity-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "beer_logs" },
        async () => {
          await load();
        }
      )
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    load();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-amber-400">
        Loading...
      </div>
    );

  const avgRating =
    logs.length > 0
      ? (logs.reduce((s, l) => s + l.rating, 0) / logs.length).toFixed(1)
      : "—";

  const cityData = TRIP_CITIES.map((city) => ({
    city: city === "České Budějovice" ? "Budějovice" : city,
    count: logs.filter((l) => l.city === city).length,
  }));

  const ratingData = [1, 2, 3, 4, 5].map((r) => ({
    stars: `${"★".repeat(r)}`,
    count: logs.filter((l) => l.rating === r).length,
  }));

  const itinerary = [
    { days: "Days 1–2", city: "Český Krumlov", icon: "🛶", theme: "Boating on the Moldau" },
    { days: "Days 3–4", city: "České Budějovice", icon: "🏭", theme: "Budvar country" },
    { days: "Days 5–7", city: "Prague", icon: "🏰", theme: "The grand finale" },
  ];
  const topBeer = [...logs].sort((a, b) => b.rating - a.rating)[0];
  const favoriteCity = TRIP_CITIES.map((city) => ({
    city,
    count: logs.filter((log) => log.city === city).length,
  })).sort((a, b) => b.count - a.count)[0];
  const uniqueBars = new Set(logs.map((log) => log.bar_name).filter(Boolean)).size;

  async function shareRecap() {
    const recap = `Hop Tracker recap: ${logs.length} beers, ${uniqueBars} pubs, ${avgRating} average rating. Top beer: ${topBeer?.beer_name ?? "TBD"}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Hop Tracker recap", text: recap });
      } else {
        await navigator.clipboard.writeText(recap);
        setShareMessage("Recap copied!");
        setTimeout(() => setShareMessage(""), 2000);
      }
    } catch {
      setShareMessage("Sharing cancelled");
      setTimeout(() => setShareMessage(""), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-700 flex items-center justify-center text-2xl overflow-hidden">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.player_name}
              className="w-full h-full object-cover"
            />
          ) : (
            "🍺"
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-amber-100">
            Cheers, {profile?.player_name}!
          </h1>
          <p className="text-amber-400 text-sm">Czech Republic Trip 2026</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-amber-900/60 border-amber-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Beer className="text-amber-400" size={24} />
            <div>
              <p className="text-2xl font-bold text-amber-100">{logs.length}</p>
              <p className="text-xs text-amber-400">Beers logged</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-900/60 border-amber-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="text-amber-400" size={24} />
            <div>
              <p className="text-2xl font-bold text-amber-100">{avgRating}</p>
              <p className="text-xs text-amber-400">Avg rating</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-900/60 border-amber-700">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="text-amber-400" size={24} />
            <div>
              <p className="text-2xl font-bold text-amber-100">
                {new Set(logs.map((l) => l.city).filter(Boolean)).size}
              </p>
              <p className="text-xs text-amber-400">Cities visited</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-900/60 border-amber-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="text-amber-400" size={24} />
            <div>
              <p className="text-2xl font-bold text-amber-100">
                {unlockedKeys.length}/{ACHIEVEMENTS.length}
              </p>
              <p className="text-xs text-amber-400">Achievements</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip itinerary */}
      <Card className="bg-amber-900/60 border-amber-700">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-amber-100 text-base">Trip itinerary</CardTitle>
            <p className="text-xs text-amber-500 mt-1">Seven days, three cities, one leaderboard</p>
          </div>
          <span className="text-xs text-emerald-400">{isLive ? "● Live" : "○ Connecting"}</span>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-2">
            {itinerary.map((stop) => {
              const count = logs.filter((log) => log.city === stop.city).length;
              return (
                <div key={stop.city} className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{stop.icon}</span>
                    <Badge variant="outline" className="border-amber-700 text-amber-400 text-xs">
                      {count} {count === 1 ? "beer" : "beers"}
                    </Badge>
                  </div>
                  <p className="text-amber-100 font-medium text-sm mt-2">{stop.city}</p>
                  <p className="text-amber-500 text-xs">{stop.days} · {stop.theme}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Beers by city */}
        <Card className="bg-amber-900/60 border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-100 text-base">
              Beers by City
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={cityData}>
                <XAxis
                  dataKey="city"
                  tick={{ fill: "#fbbf24", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#92400e", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#451a03",
                    border: "1px solid #92400e",
                    borderRadius: 8,
                    color: "#fef3c7",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {cityData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === 0 ? "#d97706" : i === 1 ? "#b45309" : "#92400e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rating distribution */}
        <Card className="bg-amber-900/60 border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-100 text-base">
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mt-1">
              {[...ratingData].reverse().map(({ stars, count }) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs w-14">{stars}</span>
                  <Progress
                    value={logs.length ? (count / logs.length) * 100 : 0}
                    className="h-3 flex-1 rounded-full bg-amber-950"
                    indicatorClassName="bg-amber-400"
                  />
                  <span className="text-amber-300 text-xs w-10 text-right">
                    {count} ({logs.length ? Math.round((count / logs.length) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity (all users) */}
      <Card className="bg-amber-900/60 border-amber-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-base">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allLogs.length === 0 ? (
            <p className="text-amber-500 text-sm">
              No beers logged yet.{" "}
              <Link href="/log-beer" className="text-amber-300 underline">
                Be the first!
              </Link>
            </p>
          ) : (
            allLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {log.profiles?.avatar_url ? (
                    <img
                      src={log.profiles.avatar_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "🍺"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-amber-100 text-sm">
                    <span className="font-medium">
                      {log.profiles?.player_name ?? "Someone"}
                    </span>{" "}
                    logged{" "}
                    <span className="font-medium">{log.beer_name}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="outline"
                      className="text-xs border-amber-700 text-amber-400 px-1 py-0"
                    >
                      {"★".repeat(log.rating)}
                    </Badge>
                    {log.city && (
                      <span className="text-amber-500 text-xs">{log.city}</span>
                    )}
                    <span className="text-amber-600 text-xs">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Trip recap */}
      <Card className="bg-amber-800/50 border-amber-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-base">Trip recap so far</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div><p className="text-xl font-bold text-amber-100">{logs.length}</p><p className="text-xs text-amber-400">Beers</p></div>
            <div><p className="text-xl font-bold text-amber-100">{uniqueBars}</p><p className="text-xs text-amber-400">Pubs</p></div>
            <div><p className="text-xl font-bold text-amber-100">{favoriteCity?.count ? favoriteCity.city : "—"}</p><p className="text-xs text-amber-400">Top city</p></div>
            <div><p className="text-xl font-bold text-amber-100">{topBeer?.beer_name ?? "—"}</p><p className="text-xs text-amber-400">Top beer</p></div>
          </div>
          <button
            type="button"
            onClick={shareRecap}
            className="mt-4 inline-flex items-center gap-2 text-sm text-amber-200 hover:text-white"
          >
            <Share2 size={16} /> Share recap
          </button>
          {shareMessage && <span className="ml-3 text-xs text-emerald-300">{shareMessage}</span>}
        </CardContent>
      </Card>

      <div className="text-center">
        <Link
          href="/log-beer"
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-full text-sm transition-colors"
        >
          <Beer size={18} />
          Log a Beer
        </Link>
      </div>
    </div>
  );
}

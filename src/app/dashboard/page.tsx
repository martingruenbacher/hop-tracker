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
import { Beer, Star, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/achievements";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<BeerLog[]>([]);
  const [allLogs, setAllLogs] = useState<BeerLog[]>([]);
  const [unlockedKeys, setUnlockedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
    load();
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
              {ratingData.reverse().map(({ stars, count }) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs w-14">{stars}</span>
                  <Progress
                    value={logs.length ? (count / logs.length) * 100 : 0}
                    className="h-2 flex-1 bg-amber-800"
                  />
                  <span className="text-amber-400 text-xs w-4">{count}</span>
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

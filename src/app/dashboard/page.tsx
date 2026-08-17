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
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Beer, Star, MapPin, Trophy, Share2, Compass, Target } from "lucide-react";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { processBeerLog } from "@/lib/process-beer-log";
import { getTodayChallenge, isToday } from "@/lib/challenges";
import {
  estimatePromille,
  PromilleSettings,
} from "@/lib/promille";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<BeerLog[]>([]);
  const [allLogs, setAllLogs] = useState<BeerLog[]>([]);
  const [groupLogs, setGroupLogs] = useState<BeerLog[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [unlockedKeys, setUnlockedKeys] = useState<string[]>([]);
  const [challengePoints, setChallengePoints] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState(0);
  const [currentChallengeAwarded, setCurrentChallengeAwarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await processBeerLog(supabase, user.id);

      const [
        { data: prof },
        { data: myLogs },
        { data: achiev },
        { data: everyone },
        { data: allGroupLogs },
        { data: completions },
        { data: groupProfiles },
      ] =
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
            .order("created_at", { ascending: false }),
          supabase.from("beer_logs").select("*"),
          supabase
            .from("challenge_completions")
            .select("points, challenge_key, challenge_date")
            .eq("user_id", user.id),
          supabase.from("profiles").select("*"),
        ]);

      if (!prof) {
        window.location.href = "/profile?setup=1";
        return;
      }
      setProfile(prof);
      setLogs(myLogs ?? []);
      setAllLogs(everyone ?? []);
      setGroupLogs(allGroupLogs ?? []);
      setAllProfiles((groupProfiles as Profile[]) ?? []);
      setUnlockedKeys(achiev?.map((a) => a.achievement_key) ?? []);
      setChallengePoints(
        (completions ?? []).reduce((sum, item) => sum + item.points, 0)
      );
      setCompletedChallenges(completions?.length ?? 0);
      const todayChallenge = getTodayChallenge();
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      setCurrentChallengeAwarded(
        (completions ?? []).some(
          (item) =>
            item.challenge_key === todayChallenge.key &&
            item.challenge_date === todayKey
        )
      );
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
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
  const groupAverage = groupLogs.length
    ? (groupLogs.reduce((sum, log) => sum + log.rating, 0) / groupLogs.length).toFixed(1)
    : "—";
  const groupPubs = new Set(
    groupLogs.map((log) => log.bar_name?.trim().toLowerCase()).filter(Boolean)
  ).size;
  const groupPlayers = new Set(groupLogs.map((log) => log.user_id)).size;
  const groupTopBeer = [...groupLogs].sort((a, b) => b.rating - a.rating)[0];
  const groupTopCity = TRIP_CITIES.map((city) => ({
    city,
    count: groupLogs.filter((log) => log.city === city).length,
  })).sort((a, b) => b.count - a.count)[0];
  const favoriteCity = TRIP_CITIES.map((city) => ({
    city,
    count: logs.filter((log) => log.city === city).length,
  })).sort((a, b) => b.count - a.count)[0];
  const uniqueBars = new Set(logs.map((log) => log.bar_name).filter(Boolean)).size;
  const todaysLogs = logs.filter((log) => isToday(log.created_at));
  const challenge = getTodayChallenge();
  const challengeProgress = Math.min(challenge.target, challenge.progress(todaysLogs));
  const challengeComplete = challengeProgress >= challenge.target;
  const displayedChallengePoints = challengePoints +
    (challengeComplete && !currentChallengeAwarded ? challenge.points : 0);
  const crawlByCity = TRIP_CITIES.map((city) => ({
    city,
    pubs: new Set(
      logs
        .filter((log) => log.city === city)
        .map((log) => log.bar_name?.trim().toLowerCase())
        .filter(Boolean)
    ).size,
  }));
  const promilleSettings: PromilleSettings = {
    weightKg: profile?.weight_kg ?? 80,
    sex: profile?.sex ?? "male",
  };
  const estimatedPromille = estimatePromille(logs, promilleSettings, now);
  const alcoholTimelineLogs = [...groupLogs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const alcoholTimelineTimes = [...new Set([
    ...alcoholTimelineLogs.map((log) => new Date(log.created_at).getTime()),
    now.getTime(),
  ])].sort((a, b) => a - b);
  const alcoholTimelinePlayers = allProfiles.filter((player) =>
    alcoholTimelineLogs.some((log) => log.user_id === player.id)
  );
  const alcoholTimeline = alcoholTimelineTimes.map((time) => {
    const point: Record<string, number> = { time };
    alcoholTimelinePlayers.forEach((player) => {
      const playerLogs = alcoholTimelineLogs.filter((log) => log.user_id === player.id);
      const logsAtTime = playerLogs.filter(
        (log) => new Date(log.created_at).getTime() <= time
      );
      point[player.id] = estimatePromille(
        logsAtTime,
        { weightKg: player.weight_kg, sex: player.sex },
        new Date(time)
      );
    });
    return point;
  });
  const alcoholTimelineColors = ["#f59e0b", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb7185"];

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

      <Card className="border-amber-700 bg-amber-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-amber-100">
            <span>⚠️</span>
            Estimated current alcohol level
          </CardTitle>
          <p className="text-xs text-amber-500">
            Rough promille estimate based on your logged beers and timestamps
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-bold text-amber-200">
                {estimatedPromille.toFixed(2)}‰
              </p>
              <p className="mt-1 text-xs text-amber-400">Estimated current level</p>
            </div>
            <p className="text-xs text-amber-500">
              Based on your profile settings: {promilleSettings.weightKg} kg, {promilleSettings.sex} formula.
              <Link href="/profile" className="ml-1 text-amber-300 underline">Update profile</Link>
            </p>
          </div>
          <p className="mt-4 rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-xs leading-5 text-red-300">
            This is only a rough educational estimate. It assumes each beer is 500 ml at 5% ABV and a metabolism of 0.15‰ per hour. It does not account for food, timing inaccuracies, health, medication, or individual metabolism. Never use it to decide whether you can drive or make a safety decision.
          </p>
        </CardContent>
      </Card>

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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily challenge */}
        <Card className="bg-amber-800/50 border-amber-600">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-amber-100">
                <Target size={18} className="text-amber-300" />
                Daily challenge
              </CardTitle>
              <p className="mt-1 text-xs text-amber-500">A new mission every day</p>
            </div>
            <span className="text-2xl">{challenge.icon}</span>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-amber-100">{challenge.title}</p>
            <p className="mt-1 text-sm text-amber-400">{challenge.description}</p>
            <div className="mt-4 flex items-center gap-3">
              <Progress
                value={(challengeProgress / challenge.target) * 100}
                className="h-3 flex-1 rounded-full bg-amber-950"
                indicatorClassName="bg-emerald-400"
              />
              <span className="shrink-0 text-xs font-medium text-amber-200">
                {challengeProgress}/{challenge.target}
              </span>
            </div>
            {challengeComplete && (
              <p className="mt-3 text-xs font-medium text-emerald-300">
                Challenge complete! +{challenge.points} points
              </p>
            )}
            {challengeProgress < challenge.target && (
              <Link href="/log-beer" className="mt-3 inline-block text-xs text-amber-300 underline">
                Log progress
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Pub crawl */}
        <Card className="bg-amber-900/60 border-amber-700">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-amber-100">
                <Compass size={18} className="text-amber-300" />
                Pub crawl
              </CardTitle>
              <p className="mt-1 text-xs text-amber-500">Named pubs visited: {uniqueBars}</p>
            </div>
            <span className="text-2xl">🚶</span>
          </CardHeader>
          <CardContent className="space-y-2">
            {crawlByCity.map(({ city, pubs }) => (
              <div key={city} className="flex items-center justify-between rounded-lg bg-amber-950/40 px-3 py-2">
                <span className="min-w-0 truncate text-sm text-amber-200">{city}</span>
                <Badge variant="outline" className="ml-2 shrink-0 border-amber-700 text-xs text-amber-400">
                  {pubs} {pubs === 1 ? "pub" : "pubs"}
                </Badge>
              </div>
            ))}
            <Link href="/log-beer" className="inline-block pt-1 text-xs text-amber-300 underline">
              Add your next checkpoint
            </Link>
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
            allLogs.slice(0, 5).map((log) => (
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

      {/* Personal recap */}
      <Card className="bg-amber-800/50 border-amber-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-base">My recap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div><p className="text-xl font-bold text-amber-100">{logs.length}</p><p className="text-xs text-amber-400">Beers</p></div>
            <div><p className="text-xl font-bold text-amber-100">{uniqueBars}</p><p className="text-xs text-amber-400">Pubs</p></div>
            <div><p className="text-xl font-bold text-amber-100">{favoriteCity?.count ? favoriteCity.city : "—"}</p><p className="text-xs text-amber-400">Top city</p></div>
            <div><p className="text-xl font-bold text-amber-100">{topBeer?.beer_name ?? "—"}</p><p className="text-xs text-amber-400">Top beer</p></div>
            <div><p className="text-xl font-bold text-amber-100">{displayedChallengePoints}</p><p className="text-xs text-amber-400">Challenge pts</p></div>
          </div>
          <p className="mt-3 text-xs text-amber-500">
            {completedChallenges} challenge{completedChallenges === 1 ? "" : "s"} completed
          </p>
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

      {/* Group recap */}
      <Card className="bg-amber-900/60 border-amber-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-base">Group recap</CardTitle>
          <p className="text-xs text-amber-500">The whole crew&apos;s trip so far</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-5">
            <div><p className="text-xl font-bold text-amber-100">{groupLogs.length}</p><p className="text-xs text-amber-400">Beers</p></div>
            <div><p className="text-xl font-bold text-amber-100">{groupAverage}</p><p className="text-xs text-amber-400">Avg rating</p></div>
            <div><p className="text-xl font-bold text-amber-100">{groupPubs}</p><p className="text-xs text-amber-400">Pubs</p></div>
            <div><p className="text-xl font-bold text-amber-100">{groupPlayers}</p><p className="text-xs text-amber-400">Players</p></div>
            <div><p className="truncate text-xl font-bold text-amber-100">{groupTopCity?.count ? groupTopCity.city : "—"}</p><p className="text-xs text-amber-400">Top city</p></div>
          </div>
          <p className="mt-4 text-sm text-amber-300">
            Group favourite so far: <span className="font-semibold">{groupTopBeer?.beer_name ?? "No beers yet"}</span>
          </p>
          <Link
            href="/photos"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-200 underline hover:text-white"
          >
            View the shared photo wall
          </Link>
          <Link
            href="/timeline"
            className="ml-4 mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-200 underline hover:text-white"
          >
            Explore the trip timeline
          </Link>
        </CardContent>
      </Card>

      <Card className="bg-amber-900/60 border-amber-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-base">
            Group alcohol levels over time
          </CardTitle>
          <p className="text-xs text-amber-500">
            Every player from their first logged beer to now. Educational estimate only.
          </p>
        </CardHeader>
        <CardContent>
          {alcoholTimelinePlayers.length === 0 || alcoholTimeline.length < 2 ? (
            <p className="py-8 text-center text-sm text-amber-500">
              Log at least one beer to start your alcohol-level timeline.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={alcoholTimeline} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickFormatter={(value) => formatDate(new Date(value).toISOString())}
                  tick={{ fill: "#fbbf24", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, "auto"]}
                  tickFormatter={(value) => `${Number(value).toFixed(1)}‰`}
                  tick={{ fill: "#fbbf24", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(new Date(Number(value)).toISOString())}
                  formatter={(value) => [`${Number(value).toFixed(2)}‰`, "Estimated level"]}
                  contentStyle={{
                    background: "#451a03",
                    border: "1px solid #92400e",
                    borderRadius: 8,
                    color: "#fef3c7",
                  }}
                />
                {alcoholTimelinePlayers.map((player, index) => (
                  <Line
                    key={player.id}
                    type="monotone"
                    dataKey={player.id}
                    name={player.player_name}
                    stroke={alcoholTimelineColors[index % alcoholTimelineColors.length]}
                    strokeWidth={3}
                    dot={{ r: 3, fill: alcoholTimelineColors[index % alcoholTimelineColors.length], stroke: "#451a03", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
          {alcoholTimelinePlayers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-amber-800/70 pt-3">
              {alcoholTimelinePlayers.map((player, index) => {
                const color = alcoholTimelineColors[index % alcoholTimelineColors.length];
                return (
                  <div key={player.id} className="flex min-w-0 items-center gap-2 text-xs text-amber-200">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="max-w-[12rem] truncate">{player.player_name}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-xs leading-5 text-red-300">
            This assumes every beer is 500 ml at 5% ABV and does not account for food, health, medication, timing inaccuracies, or individual metabolism. Never use it to decide whether you can drive.
          </p>
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

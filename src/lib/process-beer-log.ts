import type { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS, checkNewAchievements } from "@/lib/achievements";
import { getLocalDate, getTodayChallenge, isToday } from "@/lib/challenges";
import { BeerLog } from "@/lib/types";

export async function processBeerLog(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const [
    { data: allLogs },
    { data: profiles },
    { data: reactions },
    { data: rankSnapshots },
  ] = await Promise.all([
    supabase.from("beer_logs").select("*"),
    supabase.from("profiles").select("id"),
    supabase.from("photo_reactions").select("user_id, beer_log_id"),
    supabase
      .from("leaderboard_rank_snapshots")
      .select("rank, captured_at")
      .eq("user_id", userId)
      .order("captured_at", { ascending: false })
      .limit(2),
  ]);

  const logs = (allLogs as BeerLog[] ?? []).filter((log) => log.user_id === userId);
  const todayChallenge = getTodayChallenge();
  const todaysLogs = logs.filter((log) => isToday(log.created_at));

  if (todayChallenge.progress(todaysLogs) >= todayChallenge.target) {
    const today = getLocalDate();
    const { data: existingCompletion } = await supabase
      .from("challenge_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_key", todayChallenge.key)
      .eq("challenge_date", today)
      .maybeSingle();

    if (!existingCompletion) {
      await supabase.from("challenge_completions").insert({
        user_id: userId,
        challenge_key: todayChallenge.key,
        challenge_date: today,
        points: todayChallenge.points,
      });
    }
  }

  const { data: existingAchievements } = await supabase
    .from("achievements")
    .select("achievement_key")
    .eq("user_id", userId);
  const unlockedKeys = existingAchievements?.map((a) => a.achievement_key) ?? [];
  const tripEndDate = process.env.NEXT_PUBLIC_TRIP_END_DATE;
  const latestSnapshot = rankSnapshots?.[0] as { rank: number; captured_at: string } | undefined;
  const previousSnapshot = rankSnapshots?.[1] as { rank: number; captured_at: string } | undefined;
  const rankChangedWithinTenMinutes = Boolean(
    latestSnapshot &&
      previousSnapshot &&
      new Date(latestSnapshot.captured_at).getTime() - new Date(previousSnapshot.captured_at).getTime() < 10 * 60 * 1000
  );
  const achievementContext = {
    allLogs: (allLogs as BeerLog[]) ?? [],
    playerIds: (profiles ?? []).map((profile) => profile.id),
    reactions: reactions ?? [],
    currentUserId: userId,
    isTripFinalDay: Boolean(tripEndDate && getLocalDate() === tripEndDate),
    leaderboardGhost: Boolean(rankChangedWithinTenMinutes && previousSnapshot?.rank === 1 && latestSnapshot && latestSnapshot.rank > 1),
    underdog: Boolean(rankChangedWithinTenMinutes && previousSnapshot && previousSnapshot.rank > 3 && latestSnapshot && latestSnapshot.rank <= 3),
  };
  const newOnes = checkNewAchievements(logs, unlockedKeys, achievementContext);
  const plotArmor = ACHIEVEMENTS.find((achievement) => achievement.key === "plot_armor");
  if (plotArmor && newOnes.length >= 2 && !unlockedKeys.includes(plotArmor.key)) {
    newOnes.push(plotArmor);
  }

  if (newOnes.length > 0) {
    await supabase.from("achievements").insert(
      newOnes.map((achievement) => ({
        user_id: userId,
        achievement_key: achievement.key,
      }))
    );
  }

  return newOnes.map((achievement) => `${achievement.icon} ${achievement.title}`);
}

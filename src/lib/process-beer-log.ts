import type { SupabaseClient } from "@supabase/supabase-js";
import { checkNewAchievements } from "@/lib/achievements";
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
  ] = await Promise.all([
    supabase.from("beer_logs").select("*"),
    supabase.from("profiles").select("id"),
    supabase.from("photo_reactions").select("user_id, beer_log_id"),
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
  const newOnes = checkNewAchievements(logs, unlockedKeys, {
    allLogs: (allLogs as BeerLog[]) ?? [],
    playerIds: (profiles ?? []).map((profile) => profile.id),
    reactions: reactions ?? [],
    currentUserId: userId,
  });

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

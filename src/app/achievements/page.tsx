"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Medal } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AchievementsPage() {
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("achievements")
        .select("achievement_key, unlocked_at")
        .eq("user_id", user.id);

      const map: Record<string, string> = {};
      (data ?? []).forEach((a: { achievement_key: string; unlocked_at: string }) => {
        map[a.achievement_key] = a.unlocked_at;
      });

      setUnlockedMap(map);
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

  const unlocked = Object.keys(unlockedMap).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
          <Medal size={24} />
          Achievements
        </h1>
        <p className="text-amber-400 text-sm mt-1">
          {unlocked} / {ACHIEVEMENTS.length} unlocked
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = !!unlockedMap[a.key];
          const isHidden = Boolean(a.hidden && !isUnlocked);
          return (
            <Card
              key={a.key}
              className={cn(
                "border transition-all",
                isUnlocked
                  ? "border-amber-500 bg-amber-800/60"
                  : "border-amber-800 bg-amber-950/40 opacity-60"
              )}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div
                  className={cn(
                    "text-3xl w-12 h-12 flex items-center justify-center rounded-full shrink-0",
                    isUnlocked ? "bg-amber-700" : "bg-amber-900 grayscale"
                  )}
                >
                  {isHidden ? "❔" : a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-semibold",
                      isUnlocked ? "text-amber-100" : "text-amber-500"
                    )}
                  >
                      {isHidden ? "Secret achievement" : a.title}
                  </p>
                  <p className="text-xs text-amber-400 mt-0.5">
                    {isHidden ? "Keep playing to discover this one." : a.description}
                  </p>
                  {isUnlocked && (
                    <p className="text-xs text-amber-600 mt-1">
                      Unlocked {formatDate(unlockedMap[a.key])}
                    </p>
                  )}
                </div>
                {isUnlocked && (
                  <span className="text-amber-400 text-lg">✓</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

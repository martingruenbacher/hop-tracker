"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, BeerLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Camera, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { compressIfNeeded } from "@/lib/compress-image";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<BeerLog[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [weightKg, setWeightKg] = useState(80);
  const [sex, setSex] = useState<Profile["sex"]>("male");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check URL for setup mode
      const urlParams = new URLSearchParams(window.location.search);
      setIsSetup(urlParams.get("setup") === "1");

      const [{ data: prof }, { data: myLogs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("beer_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (prof) {
        setProfile(prof);
        setPlayerName(prof.player_name);
        setWeightKg(prof.weight_kg ?? 80);
        setSex(prof.sex ?? "male");
      }
      setLogs(myLogs ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let avatarUrl = profile?.avatar_url ?? null;

    // Upload avatar if selected
    if (fileRef.current?.files?.[0]) {
      const file = await compressIfNeeded(fileRef.current.files[0]);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (!uploadErr) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        // Cache-bust the URL
        avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      }
    }

    if (profile) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          player_name: playerName,
          avatar_url: avatarUrl,
          weight_kg: weightKg,
          sex,
        })
        .eq("id", user.id);
      if (updateErr) {
        setError(updateErr.message);
      } else {
        setProfile((p) =>
          p && {
            ...p,
            player_name: playerName,
            avatar_url: avatarUrl,
            weight_kg: weightKg,
            sex,
          }
        );
        setSuccess("Profile updated!");
        if (isSetup) router.push("/dashboard");
      }
    } else {
      const { error: insertErr } = await supabase.from("profiles").insert({
        id: user.id,
        player_name: playerName,
        avatar_url: avatarUrl,
        weight_kg: weightKg,
        sex,
      });
      if (insertErr) {
        setError(insertErr.message);
      } else {
        router.push("/dashboard");
      }
    }

    setSaving(false);
  }

  async function handleDelete(log: BeerLog) {
    if (!window.confirm(`Delete your ${log.beer_name} log?`)) return;

    setDeletingId(log.id);
    setError("");
    setSuccess("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: deletedBeer, error: deleteErr } = await supabase
      .from("beer_logs")
      .delete()
      .eq("id", log.id)
      .select("id")
      .maybeSingle();

    if (deleteErr || !deletedBeer) {
      setError(
        deleteErr?.message ??
          "The beer could not be deleted. Check that the owner delete policy is enabled in Supabase."
      );
    } else {
      const remainingLogs = logs.filter((current) => current.id !== log.id);
      const { data: existingAchievements, error: achievementsError } =
        await supabase
          .from("achievements")
          .select("achievement_key")
          .eq("user_id", user.id);

      if (achievementsError) {
        setError(achievementsError.message);
      } else {
        const validKeys = new Set(
          ACHIEVEMENTS.filter((achievement) =>
            achievement.check(remainingLogs, profile ?? ({} as Profile))
          ).map((achievement) => achievement.key)
        );
        const invalidKeys = (existingAchievements ?? [])
          .map((achievement) => achievement.achievement_key)
          .filter((key) => !validKeys.has(key));

        const invalidationResults = await Promise.all(
          invalidKeys.map((key) =>
            supabase
              .from("achievements")
              .delete()
              .eq("user_id", user.id)
              .eq("achievement_key", key)
              .select("id")
          )
        );
        const invalidationError = invalidationResults.find((result) => result.error)?.error;
        const invalidationDenied = invalidationResults.some(
          (result) => !result.error && result.data?.length === 0
        );

        if (invalidationError || invalidationDenied) {
          setError(
            invalidationError?.message ??
              "Achievements could not be updated. Check the achievement delete policy in Supabase."
          );
        } else {
          setLogs(remainingLogs);
          setSuccess(
            invalidKeys.length > 0
              ? "Beer log deleted and achievements updated."
              : "Beer log deleted."
          );
        }
      }
    }

    setDeletingId(null);
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-amber-400">
        Loading...
      </div>
    );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
          <User size={24} />
          {isSetup ? "Set Up Your Profile" : "Profile"}
        </h1>
        {isSetup && (
          <p className="text-amber-400 text-sm mt-1">
            Choose a player name and avatar before joining the trip!
          </p>
        )}
      </div>

      <Card className="bg-amber-900/60 border-amber-700">
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-24 h-24 rounded-full bg-amber-700 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                onClick={() => fileRef.current?.click()}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    className="w-full h-full object-cover"
                    alt="Avatar"
                  />
                ) : (
                  <span className="text-5xl">🍺</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs text-amber-400 hover:text-amber-300 underline"
              >
                Change profile picture
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-amber-200">Player Name *</Label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Hop Lord, Beer King..."
                required
                maxLength={30}
                className="bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-amber-200">Weight (kg)</Label>
                <Input
                  type="number"
                  min="40"
                  max="250"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  required
                  className="bg-amber-900/50 border-amber-700 text-amber-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-amber-200">Promille formula</Label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Profile["sex"])}
                  className="h-9 w-full rounded-md border border-amber-700 bg-amber-900/50 px-3 text-sm text-amber-100"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-amber-500">
              These settings personalize the rough dashboard estimate. They are not a safety measurement.
            </p>

            {error && (
              <p className="text-red-400 text-sm bg-red-950/30 p-2 rounded">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-400 text-sm bg-green-950/30 p-2 rounded">
                {success}
              </p>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              {saving ? "Saving..." : isSetup ? "Let's Go! 🍺" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Beer history */}
      {!isSetup && logs.length > 0 && (
        <Card className="bg-amber-900/60 border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-100 text-base">
              My Beer History ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.map((log) => (
              <div key={log.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-amber-100 font-medium text-sm">
                      {log.beer_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-amber-400 text-xs">
                        {"★".repeat(log.rating)}
                        {"☆".repeat(5 - log.rating)}
                      </span>
                      {log.city && (
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-700 text-amber-500 px-1 py-0"
                        >
                          {log.city}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-amber-600">
                      {formatDate(log.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(log)}
                      disabled={deletingId === log.id}
                      aria-label={`Delete ${log.beer_name}`}
                      title="Delete beer log"
                      className="p-1 text-amber-600 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <Separator className="mt-3 bg-amber-800/50" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

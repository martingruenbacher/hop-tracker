"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BEER_STYLES, TRIP_CITIES, CZECH_BEERS } from "@/lib/utils";
import { ACHIEVEMENTS, checkNewAchievements } from "@/lib/achievements";
import { compressIfNeeded } from "@/lib/compress-image";
import { BeerLog } from "@/lib/types";
import { Beer, Star } from "lucide-react";

export default function LogBeerPage() {
  const router = useRouter();

  const [beerName, setBeerName] = useState("");
  const [brewery, setBrewery] = useState("");
  const [style, setStyle] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [city, setCity] = useState("");
  const [barName, setBarName] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newAchievements, setNewAchievements] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please give the beer a rating!");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let photoUrl: string | null = null;
    if (photo) {
      const compressed = await compressIfNeeded(photo);
      const ext = compressed.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("beer-photos")
        .upload(path, compressed);
      if (!uploadErr) {
        const { data } = supabase.storage
          .from("beer-photos")
          .getPublicUrl(path);
        photoUrl = data.publicUrl;
      }
    }

    const { error: insertErr } = await supabase.from("beer_logs").insert({
      user_id: user.id,
      beer_name: beerName,
      brewery: brewery || null,
      style: style || null,
      rating,
      city: city || null,
      bar_name: barName || null,
      notes: notes || null,
      photo_url: photoUrl,
    });

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    // Check for new achievements
    const { data: allLogs } = await supabase
      .from("beer_logs")
      .select("*")
      .eq("user_id", user.id);
    const { data: existingAchievements } = await supabase
      .from("achievements")
      .select("achievement_key")
      .eq("user_id", user.id);

    const unlockedKeys =
      existingAchievements?.map((a) => a.achievement_key) ?? [];
    const newOnes = checkNewAchievements(
      (allLogs as BeerLog[]) ?? [],
      unlockedKeys
    );

    if (newOnes.length > 0) {
      await supabase.from("achievements").insert(
        newOnes.map((a) => ({ user_id: user.id, achievement_key: a.key }))
      );
      setNewAchievements(newOnes.map((a) => `${a.icon} ${a.title}`));
    } else {
      router.push("/dashboard");
    }

    setLoading(false);
  }

  if (newAchievements.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="text-6xl animate-bounce">🏆</div>
        <h2 className="text-2xl font-bold text-amber-100">
          Achievement Unlocked!
        </h2>
        <div className="space-y-2">
          {newAchievements.map((a) => (
            <p key={a} className="text-xl text-amber-300">
              {a}
            </p>
          ))}
        </div>
        <Button
          onClick={() => router.push("/dashboard")}
          className="bg-amber-600 hover:bg-amber-500 mt-4"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
          <Beer size={24} />
          Log a Beer
        </h1>
        <p className="text-amber-400 text-sm mt-1">
          What are you drinking right now?
        </p>
      </div>

      <Card className="bg-amber-900/60 border-amber-700">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Beer name with autocomplete suggestions */}
            <div className="space-y-2">
              <Label className="text-amber-200">Beer Name *</Label>
              <Input
                value={beerName}
                onChange={(e) => setBeerName(e.target.value)}
                placeholder="e.g. Budvar, Pilsner Urquell..."
                required
                list="beer-suggestions"
                className="bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600"
              />
              <datalist id="beer-suggestions">
                {CZECH_BEERS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-amber-200">Brewery</Label>
                <Input
                  value={brewery}
                  onChange={(e) => setBrewery(e.target.value)}
                  placeholder="Brewery name"
                  className="bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-amber-200">Style</Label>
                <Select value={style} onValueChange={(v) => setStyle(v ?? "")}>
                  <SelectTrigger className="bg-amber-900/50 border-amber-700 text-amber-100">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent className="bg-amber-900 border-amber-700">
                    {BEER_STYLES.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="text-amber-100 focus:bg-amber-700"
                      >
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Star rating */}
            <div className="space-y-2">
              <Label className="text-amber-200">Rating *</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl transition-transform hover:scale-110"
                  >
                    <Star
                      size={32}
                      className={
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-amber-700"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-amber-200">City</Label>
                <Select value={city} onValueChange={(v) => setCity(v ?? "")}>
                  <SelectTrigger className="bg-amber-900/50 border-amber-700 text-amber-100">
                    <SelectValue placeholder="Where are you?" />
                  </SelectTrigger>
                  <SelectContent className="bg-amber-900 border-amber-700">
                    {TRIP_CITIES.map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                        className="text-amber-100 focus:bg-amber-700"
                      >
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-amber-200">Bar / Pub</Label>
                <Input
                  value={barName}
                  onChange={(e) => setBarName(e.target.value)}
                  placeholder="Bar name"
                  className="bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-amber-200">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tasting notes, vibes..."
                rows={2}
                className="bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-amber-200">Photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="bg-amber-900/50 border-amber-700 text-amber-100 file:text-amber-300 file:bg-amber-800 file:border-0 file:rounded file:mr-2 file:px-2 file:py-1 file:text-xs"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950/30 p-2 rounded">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              {loading ? "Logging..." : "🍺 Log Beer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

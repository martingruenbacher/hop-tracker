"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Beer, Camera, ImagePlus, Save, Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BEER_STYLES, TRIP_CITIES } from "@/lib/utils";
import { BeerLog, Profile } from "@/lib/types";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { processBeerLog } from "@/lib/process-beer-log";
import { compressIfNeeded } from "@/lib/compress-image";
import { Pub } from "@/lib/map-types";

const VOLUMES = [["0.2", "0.2 l"], ["0.3", "0.3 l"], ["0.4", "0.4 l"], ["0.5", "0.5 l"], ["0.75", "0.75 l"], ["1", "1.0 l"]];

export default function EditBeerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [log, setLog] = useState<BeerLog | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [beerName, setBeerName] = useState("");
  const [brewery, setBrewery] = useState("");
  const [style, setStyle] = useState("");
  const [volumeLiters, setVolumeLiters] = useState("0.5");
  const [rating, setRating] = useState(0);
  const [city, setCity] = useState("");
  const [barName, setBarName] = useState("");
  const [pubId, setPubId] = useState("none");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const [{ data: beer, error: beerError }, { data: currentProfile }, { data: pubData }] = await Promise.all([
        supabase.from("beer_logs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("pubs").select("*").order("city").order("name"),
      ]);
      if (beerError || !beer) {
        setError("This beer log could not be found or you do not own it.");
      } else {
        const current = beer as BeerLog;
        setLog(current);
        setBeerName(current.beer_name);
        setBrewery(current.brewery ?? "");
        setStyle(current.style ?? "");
        setVolumeLiters(String(current.volume_liters ?? 0.5));
        setRating(current.rating);
        setCity(current.city ?? "");
        setBarName(current.bar_name ?? "");
        setPubId(current.pub_id ?? "none");
        setNotes(current.notes ?? "");
      }
      setProfile(currentProfile as Profile | null);
      setPubs((pubData as Pub[]) ?? []);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!log || !beerName.trim() || rating === 0) { setError("Please complete the beer name and rating."); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();
    let photoUrl = log.photo_url;
    if (photo) {
      const compressed = await compressIfNeeded(photo);
      const extension = compressed.name.split(".").pop() ?? "jpg";
      const path = `${log.user_id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("beer-photos").upload(path, compressed);
      if (uploadError) { setError(uploadError.message); setSaving(false); return; }
      photoUrl = supabase.storage.from("beer-photos").getPublicUrl(path).data.publicUrl;
    }
    const { error: updateError } = await supabase.from("beer_logs").update({
      beer_name: beerName.trim(), brewery: brewery.trim() || null, style: style || null,
      volume_liters: Number(volumeLiters), rating, city: city.trim() || null,
      bar_name: barName.trim() || null, pub_id: pubId === "none" ? null : pubId,
      notes: notes.trim() || null, photo_url: photoUrl,
    }).eq("id", log.id).eq("user_id", log.user_id);
    if (updateError) { setError(updateError.message); setSaving(false); return; }

    if (profile) {
      const { data: remainingLogs } = await supabase.from("beer_logs").select("*").eq("user_id", log.user_id);
      const { data: existing } = await supabase.from("achievements").select("achievement_key").eq("user_id", log.user_id);
      const validKeys = new Set(ACHIEVEMENTS.filter((achievement) => achievement.hidden || achievement.check((remainingLogs as BeerLog[]) ?? [], profile)).map((achievement) => achievement.key));
      const invalidKeys = (existing ?? []).map((item) => item.achievement_key).filter((key) => !validKeys.has(key));
      if (invalidKeys.length > 0) await supabase.from("achievements").delete().eq("user_id", log.user_id).in("achievement_key", invalidKeys);
      await processBeerLog(supabase, log.user_id);
    }
    router.push("/profile");
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-amber-400">Loading...</div>;
  if (!log) return <div className="mx-auto max-w-lg space-y-4"><p className="text-red-300">{error}</p><Button onClick={() => router.push("/profile")}><ArrowLeft size={16} /> Back to profile</Button></div>;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-amber-100"><Beer size={24} /> Edit Beer</h1><p className="mt-1 text-sm text-amber-400">Update your log and recalculate badges.</p></div><Button type="button" variant="outline" onClick={() => router.push("/profile")}><ArrowLeft size={16} /> Back</Button></div>
      <Card className="border-amber-700 bg-amber-900/60"><CardContent className="pt-6"><form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2"><Label className="text-amber-200">Beer name *</Label><Input value={beerName} onChange={(e) => setBeerName(e.target.value)} required className="bg-amber-900/50 border-amber-700 text-amber-100" /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label className="text-amber-200">Brewery</Label><Input value={brewery} onChange={(e) => setBrewery(e.target.value)} className="bg-amber-900/50 border-amber-700 text-amber-100" /></div><div className="space-y-2"><Label className="text-amber-200">Style</Label><Select value={style} onValueChange={(v) => setStyle(v ?? "")}><SelectTrigger className="bg-amber-900/50 border-amber-700 text-amber-100"><SelectValue placeholder="Select style" /></SelectTrigger><SelectContent className="bg-amber-900 border-amber-700">{BEER_STYLES.map((item) => <SelectItem key={item} value={item} className="text-amber-100 focus:bg-amber-700">{item}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="space-y-2"><Label className="text-amber-200">Beer amount *</Label><Select value={volumeLiters} onValueChange={(v) => setVolumeLiters(v ?? "0.5")}><SelectTrigger className="bg-amber-900/50 border-amber-700 text-amber-100"><SelectValue /></SelectTrigger><SelectContent className="bg-amber-900 border-amber-700">{VOLUMES.map(([value, label]) => <SelectItem key={value} value={value} className="text-amber-100 focus:bg-amber-700">{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label className="text-amber-200">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} list="edit-city-list" className="bg-amber-900/50 border-amber-700 text-amber-100" /><datalist id="edit-city-list">{TRIP_CITIES.map((item) => <option key={item} value={item} />)}</datalist></div><div className="space-y-2"><Label className="text-amber-200">Bar / Pub</Label><Input value={barName} onChange={(e) => setBarName(e.target.value)} className="bg-amber-900/50 border-amber-700 text-amber-100" /></div></div>
        {pubs.length > 0 && <div className="space-y-2"><Label className="text-amber-200">Map checkpoint</Label><Select value={pubId} onValueChange={(v) => setPubId(v ?? "none")}><SelectTrigger className="bg-amber-900/50 border-amber-700 text-amber-100"><SelectValue placeholder="No checkpoint" /></SelectTrigger><SelectContent className="bg-amber-900 border-amber-700"><SelectItem value="none" className="text-amber-100">No checkpoint</SelectItem>{pubs.map((pub) => <SelectItem key={pub.id} value={pub.id} className="text-amber-100 focus:bg-amber-700">{pub.name} · {pub.city}</SelectItem>)}</SelectContent></Select></div>}
        <div className="space-y-2"><Label className="text-amber-200">Rating *</Label><div className="flex gap-1">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => setRating(star)} className="text-3xl"><Star size={32} className={star <= rating ? "fill-amber-400 text-amber-400" : "text-amber-700"} /></button>)}</div></div>
        <div className="space-y-2"><Label className="text-amber-200">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="resize-none bg-amber-900/50 border-amber-700 text-amber-100" /></div>
        <div className="space-y-2"><Label className="text-amber-200">Replace photo</Label><input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="hidden" /><input ref={galleryRef} type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="hidden" /><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => cameraRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white"><Camera size={18} /> Take photo</button><button type="button" onClick={() => galleryRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-700 bg-amber-900/60 px-4 py-2 text-sm font-semibold text-amber-200"><ImagePlus size={18} /> Choose photo</button></div><p className="text-xs text-amber-500">{photo ? `New photo: ${photo.name}` : log.photo_url ? "Existing photo will be kept" : "No photo attached"}</p></div>
        {error && <p className="rounded bg-red-950/30 p-2 text-sm text-red-300">{error}</p>}
        <Button type="submit" disabled={saving} className="w-full bg-amber-600 text-white hover:bg-amber-500"><Save size={17} /> {saving ? "Saving..." : "Save changes"}</Button>
      </form></CardContent></Card>
    </div>
  );
}

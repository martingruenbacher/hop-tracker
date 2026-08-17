"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { BEER_STYLES, TRIP_CITIES, CZECH_BEERS } from "@/lib/utils";
import { processBeerLog } from "@/lib/process-beer-log";
import { compressIfNeeded } from "@/lib/compress-image";
import { Pub } from "@/lib/map-types";
import { Beer, Camera, ImagePlus, LocateFixed, Search, Star } from "lucide-react";
import {
  getOfflineLogs,
  migrateLegacyOfflineLogs,
  queueOfflineLog,
  removeOfflineLog,
} from "@/lib/offline-logs";

interface PubSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

type Coordinates = {
  latitude: number;
  longitude: number;
};

function cityFromSearchResult(result: PubSearchResult): string {
  const match = TRIP_CITIES.find((tripCity) =>
    result.display_name.toLowerCase().includes(tripCity.toLowerCase())
  );
  return (
    match ??
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality ??
    ""
  );
}

export default function LogBeerPage() {
  const router = useRouter();

  const [beerName, setBeerName] = useState("");
  const [brewery, setBrewery] = useState("");
  const [style, setStyle] = useState("");
  const [volumeLiters, setVolumeLiters] = useState("0.5");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [city, setCity] = useState("");
  const [barName, setBarName] = useState("");
  const [locationCoordinates, setLocationCoordinates] = useState<Coordinates | null>(null);
  const [pubId, setPubId] = useState("");
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [pendingPub, setPendingPub] = useState<Omit<Pub, "id"> | null>(null);
  const [searchResults, setSearchResults] = useState<PubSearchResult[]>([]);
  const [searchingPubs, setSearchingPubs] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function initializeOfflineQueue() {
      await migrateLegacyOfflineLogs();
      setOfflineCount((await getOfflineLogs()).length);
    }
    initializeOfflineQueue();
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    const supabase = createClient();
    supabase
      .from("pubs")
      .select("*")
      .order("city")
      .order("name")
      .then(({ data }) => setPubs((data as Pub[]) ?? []));

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    async function shouldSync() {
      return (await getOfflineLogs()).length > 0;
    }

    async function syncOfflineLogs() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const queued of await getOfflineLogs()) {
        let photoUrl: string | null = null;
        if (queued.photo) {
          const extension = queued.photoName?.split(".").pop() ?? "jpg";
          const path = `${user.id}/${Date.now()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("beer-photos")
            .upload(path, queued.photo);
          if (uploadError) {
            setSyncMessage("Some offline beers are waiting to sync.");
            break;
          }
          photoUrl = supabase.storage.from("beer-photos").getPublicUrl(path).data.publicUrl;
        }
        const { error: syncError } = await supabase.from("beer_logs").insert({
          user_id: user.id,
          beer_name: queued.beerName,
          brewery: queued.brewery,
          style: queued.style,
          volume_liters: queued.volumeLiters ?? 0.5,
          rating: queued.rating,
          city: queued.city,
          bar_name: queued.barName,
          pub_id: queued.pubId,
          notes: queued.notes,
          photo_url: photoUrl,
          created_at: queued.createdAt,
        });
        if (syncError) {
          setSyncMessage("Some offline beers are waiting to sync.");
          break;
        }
        await processBeerLog(supabase, user.id);
        await removeOfflineLog(queued.queueId);
      }

      const remaining = (await getOfflineLogs()).length;
      setOfflineCount(remaining);
      if (remaining === 0) setSyncMessage("Offline beers synced.");
    }

    shouldSync().then((hasLogs) => {
      if (hasLogs) syncOfflineLogs();
    });
  }, [isOnline]);

  async function searchForPub() {
    if (!barName.trim()) {
      setSearchError("Enter a bar name first.");
      return;
    }

    setSearchingPubs(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const countryQueries = ["Czech Republic", "Austria"];
      const responses = await Promise.all(
        countryQueries.map(async (country) => {
          const locationHint = city ? `, ${city}` : "";
          const query = encodeURIComponent(`${barName.trim()}${locationHint}, ${country}`);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&addressdetails=1&namedetails=1&accept-language=en&countrycodes=cz,at&q=${query}`
          );
          return response.ok ? ((await response.json()) as PubSearchResult[]) : [];
        })
      );
      const results = responses
        .flat()
        .filter((result, index, all) =>
          all.findIndex((candidate) => candidate.lat === result.lat && candidate.lon === result.lon) === index
        );
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError("No matching places found. Try a shorter pub name.");
      }
    } catch (searchFailure) {
      setSearchError(
        searchFailure instanceof Error
          ? searchFailure.message
          : "Could not search for that pub."
      );
    } finally {
      setSearchingPubs(false);
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setSearchError("Location services are not available in this browser.");
      return;
    }

    setLocating(true);
    setSearchError("");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 60_000,
        })
      );
      const { latitude, longitude } = position.coords;
      setLocationCoordinates({ latitude, longitude });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      if (!response.ok) throw new Error("Could not identify your current place.");

      const result = (await response.json()) as {
        display_name?: string;
        address?: {
          road?: string;
          house_number?: string;
          city?: string;
          town?: string;
          village?: string;
          municipality?: string;
        };
      };
      const detectedCity =
        result.address?.city ??
        result.address?.town ??
        result.address?.village ??
        result.address?.municipality ??
        "";
      const detectedAddress = [
        result.address?.road,
        result.address?.house_number,
      ]
        .filter(Boolean)
        .join(" ");
      const address = detectedAddress || result.display_name || "Current address";

      setBarName(address);
      if (detectedCity) setCity(detectedCity);
      setSearchError(
        `${address}${detectedCity ? `, ${detectedCity}` : ""} detected. Search the map to confirm the location.`
      );
    } catch (locationError) {
      setSearchError(
        locationError instanceof GeolocationPositionError && locationError.code === 1
          ? "Location permission was denied. Enable it in your browser settings."
          : "Could not determine your current location. Try searching by pub name."
      );
    } finally {
      setLocating(false);
    }
  }

  async function choosePub(result: PubSearchResult) {
    const name = result.name?.trim() || barName.trim();
    const resultCity = city.trim() || cityFromSearchResult(result);
    if (!resultCity) {
      setSearchError(
        "The result has no city. Enter its city before adding it to the map."
      );
      return;
    }
    setPendingPub({
      name,
      city: resultCity,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
    });
    setLocationCoordinates(null);
    setPubId("");
    setCity(resultCity);
    setBarName(name);
    setSearchResults([]);
    setSearchError("Location selected. It will be added when this beer is saved.");
  }

  async function resolvePubForSave(): Promise<Omit<Pub, "id"> | null> {
    if (pendingPub || pubId || !barName.trim() || !city.trim()) return pendingPub;

    if (locationCoordinates) {
      return {
        name: barName.trim(),
        city: city.trim(),
        ...locationCoordinates,
      };
    }

    const queries = [
      `${barName.trim()}, ${city.trim()}, Czech Republic`,
      `${barName.trim()}, ${city.trim()}, Austria`,
      `${barName.trim()}, ${city.trim()}`,
      barName.trim(),
    ];
    let result: PubSearchResult | undefined;
    for (const queryText of queries) {
      const query = encodeURIComponent(queryText);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&accept-language=en&q=${query}`
      );
      if (!response.ok) continue;
      const [candidate] = (await response.json()) as PubSearchResult[];
      if (candidate) {
        result = candidate;
        break;
      }
    }
    if (!result || !Number.isFinite(Number(result.lat)) || !Number.isFinite(Number(result.lon))) {
      throw new Error("The address could not be located for the map.");
    }

    return {
      name: result.name?.trim() || barName.trim(),
      city: city.trim(),
      latitude: Number(result.lat),
      longitude: Number(result.lon),
    };
  }

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

    if (!navigator.onLine) {
      await queueOfflineLog({
        userId: user.id,
        beerName,
        brewery: brewery || null,
        style: style || null,
        volumeLiters: Number(volumeLiters),
        rating,
        city: city || null,
        barName: barName || null,
        pubId: pubId || null,
        notes: notes || null,
        createdAt: new Date().toISOString(),
        photo: photo ?? undefined,
        photoName: photo?.name,
      });
      setOfflineCount((await getOfflineLogs()).length);
      setSyncMessage("Beer saved on this phone and will sync when online.");
      setLoading(false);
      return;
    }

    let pubToSave: Omit<Pub, "id"> | null = pendingPub;
    if (!pubId && !pendingPub && barName.trim() && city.trim()) {
      try {
        pubToSave = await resolvePubForSave();
      } catch (mapFailure) {
        setError(mapFailure instanceof Error
          ? mapFailure.message
          : "The address could not be located for the map.");
        setLoading(false);
        return;
      }
    }

    let savedPubId = pubId || null;
    if (pubToSave) {
      const existingPub = pubs.find(
        (pub) =>
          pub.name.trim().toLowerCase() === pubToSave?.name.trim().toLowerCase() &&
          pub.city.trim().toLowerCase() === pubToSave?.city.trim().toLowerCase()
      );
      const { data: savedPub, error: pubError } = existingPub
        ? { data: existingPub, error: null }
        : await supabase
            .from("pubs")
            .insert(pubToSave)
            .select("*")
            .single();
      if (pubError || !savedPub) {
        setError(
          `The beer could not be saved because its map location failed: ${
            pubError?.message ?? "unknown error"
          }`
        );
        setLoading(false);
        return;
      }
      savedPubId = savedPub.id;
    }

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

    const { data: savedBeer, error: insertErr } = await supabase
      .from("beer_logs")
      .insert({
      user_id: user.id,
      beer_name: beerName,
      brewery: brewery || null,
      style: style || null,
      volume_liters: Number(volumeLiters),
      rating,
      city: city || null,
      bar_name: barName || null,
      pub_id: savedPubId,
      notes: notes || null,
      photo_url: photoUrl,
      })
      .select("id")
      .single();

    if (insertErr || !savedBeer) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    const newAchievementNames = await processBeerLog(supabase, user.id);
    if (newAchievementNames.length > 0) {
      setNewAchievements(newAchievementNames);
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

      {(!isOnline || offlineCount > 0 || syncMessage) && (
        <div className="mb-4 rounded-lg border border-amber-600 bg-amber-900/70 p-3 text-sm text-amber-200">
          <p className="font-medium">{isOnline ? "Sync status" : "Offline mode"}</p>
          <p className="mt-1 text-xs opacity-80">
            {isOnline
              ? `${offlineCount} offline ${offlineCount === 1 ? "beer is" : "beers are"} syncing.`
              : "Beer logs and photos are saved on this phone and sync automatically when you reconnect."}
          </p>
          {syncMessage && <p className="mt-1 text-xs">{syncMessage}</p>}
        </div>
      )}

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="space-y-2">
              <Label className="text-amber-200">Beer amount *</Label>
              <Select value={volumeLiters} onValueChange={(value) => setVolumeLiters(value ?? "0.5")}>
                <SelectTrigger className="bg-amber-900/50 border-amber-700 text-amber-100">
                  <SelectValue placeholder="Select amount" />
                </SelectTrigger>
                <SelectContent className="bg-amber-900 border-amber-700">
                  {[["0.2", "0.2 l"], ["0.3", "0.3 l"], ["0.4", "0.4 l"], ["0.5", "0.5 l"], ["0.75", "0.75 l"], ["1", "1.0 l"]].map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-amber-100 focus:bg-amber-700">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pubs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-amber-200">Map checkpoint (optional)</Label>
                <Select value={pubId} onValueChange={(v) => setPubId(v ?? "")}>
                  <SelectTrigger className="bg-amber-900/50 border-amber-700 text-amber-100">
                    <SelectValue placeholder="Select a mapped pub" />
                  </SelectTrigger>
                  <SelectContent className="bg-amber-900 border-amber-700">
                    {pubs.map((pub) => (
                      <SelectItem
                        key={pub.id}
                        value={pub.id}
                        className="text-amber-100 focus:bg-amber-700"
                      >
                        {pub.name} · {pub.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-amber-200">Find an address for the map</Label>
              <div className="flex gap-2">
                <Input
                  value={barName}
                  onChange={(e) => {
                    setBarName(e.target.value);
                    setLocationCoordinates(null);
                  }}
                  placeholder="Enter an address or bar name"
                  className="min-w-0 flex-1 bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600"
                />
                <Button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="shrink-0 border border-amber-700 bg-amber-900 px-3 text-amber-200 hover:bg-amber-800"
                  title="Use current phone location"
                >
                  <LocateFixed size={17} />
                  <span className="hidden sm:inline">{locating ? "Locating" : "GPS"}</span>
                </Button>
                <Button
                  type="button"
                  onClick={searchForPub}
                  disabled={searchingPubs}
                  className="shrink-0 bg-amber-700 px-3 hover:bg-amber-600"
                  title="Search OpenStreetMap"
                >
                  <Search size={17} />
                  <span className="hidden sm:inline">{searchingPubs ? "Searching" : "Search map"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-amber-600">Search covers the Czech Republic and Austria. Confirm the result and city before adding it.</p>
              {searchError && <p className="text-xs text-amber-300">{searchError}</p>}
              {searchResults.length > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-700 bg-amber-950/50 p-2">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.lat}-${result.lon}`}
                      type="button"
                      onClick={() => choosePub(result)}
                      className="w-full rounded-md p-2 text-left text-xs text-amber-200 hover:bg-amber-800"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-amber-200">City</Label>
                <Input
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setLocationCoordinates(null);
                  }}
                  placeholder="e.g. Prague, Brno, Vienna..."
                  list="city-suggestions"
                  className="bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600"
                />
                <datalist id="city-suggestions">
                  {TRIP_CITIES.map((tripCity) => (
                    <option key={tripCity} value={tripCity} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label className="text-amber-200">Bar / Pub</Label>
                <Input
                  value={barName}
                  onChange={(e) => {
                    setBarName(e.target.value);
                    setLocationCoordinates(null);
                  }}
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
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                >
                  <Camera size={18} />
                  Take photo
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-700 bg-amber-900/60 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-800"
                >
                  <ImagePlus size={18} />
                  Choose from gallery
                </button>
              </div>
              <p className="truncate text-xs text-amber-500">
                {photo ? `Selected: ${photo.name}` : "No photo selected"}
              </p>
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

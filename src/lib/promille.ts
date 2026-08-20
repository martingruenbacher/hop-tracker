import { BeerLog } from "@/lib/types";

export type BodySex = "male" | "female";

export interface PromilleSettings {
  weightKg: number;
  sex: BodySex;
}

export interface PromilleTimelinePoint {
  time: number;
  level: number;
}

const DEFAULT_SETTINGS: PromilleSettings = {
  weightKg: 80,
  sex: "male",
};

export function estimatePromille(
  logs: BeerLog[],
  settings: PromilleSettings = DEFAULT_SETTINGS,
  now = new Date()
) {
  const distributionRatio = settings.sex === "female" ? 0.55 : 0.68;
  const metabolismPerHour = 0.15;
  const weightKg = Math.max(40, settings.weightKg || DEFAULT_SETTINGS.weightKg);
  const sortedLogs = [...logs]
    .filter((log) => new Date(log.created_at).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let level = 0;
  let previousTime = sortedLogs[0]
    ? new Date(sortedLogs[0].created_at).getTime()
    : now.getTime();

  for (const log of sortedLogs) {
    const timestamp = new Date(log.created_at).getTime();
    level = Math.max(0, level - ((timestamp - previousTime) / 3_600_000) * metabolismPerHour);
    const alcoholGrams = (log.volume_liters ?? 0.5) * 1000 * 0.05 * 0.789;
    level += alcoholGrams / (weightKg * distributionRatio);
    previousTime = timestamp;
  }

  return Math.max(0, level - ((now.getTime() - previousTime) / 3_600_000) * metabolismPerHour);
}

export function buildPromilleTimeline(
  logs: BeerLog[],
  settings: PromilleSettings,
  now = new Date(),
  intervalMinutes = 15
): PromilleTimelinePoint[] {
  const validLogs = logs
    .filter((log) => new Date(log.created_at).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (validLogs.length === 0) return [];

  const start = new Date(validLogs[0].created_at).getTime();
  const interval = intervalMinutes * 60_000;
  const times = new Set<number>();
  for (let time = start; time <= now.getTime(); time += interval) times.add(time);
  validLogs.forEach((log) => times.add(new Date(log.created_at).getTime()));
  times.add(now.getTime());

  return [...times]
    .sort((a, b) => a - b)
    .map((time) => ({
      time,
      level: estimatePromille(validLogs, settings, new Date(time)),
    }));
}

export function estimatePeakPromille(
  logs: BeerLog[],
  settings: PromilleSettings = DEFAULT_SETTINGS
) {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  let peak = 0;
  for (let index = 0; index < sortedLogs.length; index += 1) {
    const timestamp = new Date(sortedLogs[index].created_at);
    peak = Math.max(
      peak,
      estimatePromille(sortedLogs.slice(0, index + 1), settings, timestamp)
    );
  }
  return peak;
}

export function getPromilleSettings(): PromilleSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = window.localStorage.getItem("hop-tracker-promille-settings");
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<PromilleSettings>;
    return {
      weightKg: typeof parsed.weightKg === "number" ? parsed.weightKg : DEFAULT_SETTINGS.weightKg,
      sex: parsed.sex === "female" ? "female" : "male",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function savePromilleSettings(settings: PromilleSettings) {
  window.localStorage.setItem(
    "hop-tracker-promille-settings",
    JSON.stringify(settings)
  );
}

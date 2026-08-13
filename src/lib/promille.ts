import { BeerLog } from "@/lib/types";

export type BodySex = "male" | "female";

export interface PromilleSettings {
  weightKg: number;
  sex: BodySex;
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

  return Math.max(
    0,
    logs.reduce((level, log) => {
      const hoursSinceDrink = Math.max(
        0,
        (now.getTime() - new Date(log.created_at).getTime()) / 3_600_000
      );
      const alcoholGrams = 500 * 0.05 * 0.789;
      const initialPromille = alcoholGrams / (weightKg * distributionRatio);
      return level + Math.max(0, initialPromille - hoursSinceDrink * metabolismPerHour);
    }, 0)
  );
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

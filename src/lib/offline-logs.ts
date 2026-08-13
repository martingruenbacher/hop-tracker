export interface OfflineBeerLog {
  queueId: string;
  userId: string;
  beerName: string;
  brewery: string | null;
  style: string | null;
  rating: number;
  city: string | null;
  barName: string | null;
  pubId: string | null;
  notes: string | null;
  createdAt: string;
}

const STORAGE_KEY = "hop-tracker-offline-beer-logs";

export function getOfflineLogs(): OfflineBeerLog[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as OfflineBeerLog[];
  } catch {
    return [];
  }
}

export function queueOfflineLog(log: Omit<OfflineBeerLog, "queueId">) {
  const queued = [...getOfflineLogs(), { ...log, queueId: crypto.randomUUID() }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queued));
}

export function removeOfflineLog(queueId: string) {
  const remaining = getOfflineLogs().filter((log) => log.queueId !== queueId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}

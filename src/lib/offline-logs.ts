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
  photo?: Blob;
  photoName?: string;
}

const DATABASE_NAME = "hop-tracker-offline";
const STORE_NAME = "beer-logs";
const LEGACY_STORAGE_KEY = "hop-tracker-offline-beer-logs";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE_NAME, { keyPath: "queueId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineLogs(): Promise<OfflineBeerLog[]> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return [];
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll();
    request.onsuccess = () => resolve(request.result as OfflineBeerLog[]);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineLog(log: Omit<OfflineBeerLog, "queueId">) {
  const database = await openDatabase();
  const queued = { ...log, queueId: crypto.randomUUID() };
  return new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .add(queued);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeOfflineLog(queueId: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .delete(queueId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function migrateLegacyOfflineLogs() {
  if (typeof window === "undefined") return;
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return;
  try {
    const logs = JSON.parse(legacy) as Omit<OfflineBeerLog, "queueId">[];
    for (const log of logs) await queueOfflineLog(log);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Keep legacy data if migration cannot complete.
  }
}

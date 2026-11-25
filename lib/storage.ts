import type { QuotesResponse } from "@/lib/types";

const STORAGE_KEY = "meridian.snapshot.v1";

let cachedRaw: string | null | undefined;
let cachedSnapshot: QuotesResponse | null = null;

export function subscribeSnapshots(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function emptySnapshot(): QuotesResponse | null {
  return null;
}

function isSnapshot(value: unknown): value is QuotesResponse {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<QuotesResponse>;
  return typeof snapshot.fetchedAt === "string" && Array.isArray(snapshot.quotes);
}

export function readSnapshot(): QuotesResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    if (!raw) {
      cachedSnapshot = null;
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    cachedSnapshot = isSnapshot(parsed) ? parsed : null;
    return cachedSnapshot;
  } catch {
    return cachedSnapshot;
  }
}

export function writeSnapshot(snapshot: QuotesResponse) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(snapshot);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSnapshot = snapshot;
  } catch {
    // Private mode and full storage can reject writes. The screen still works.
  }
}

const STORAGE_KEY = "one-more-glow-asteroids-high-score";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readHighScore(getStorage: () => KeyValueStorage): number {
  try {
    const value = Number(getStorage().getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function writeHighScore(getStorage: () => KeyValueStorage, score: number): void {
  try { getStorage().setItem(STORAGE_KEY, String(score)); }
  catch { /* Storage can be unavailable without affecting play. */ }
}

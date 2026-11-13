export const HIGH_SCORE_LIMIT = 10;

const STORAGE_KEY = "one-more-glow-very-angry-robots-high-scores";

export interface HighScoreEntry {
  initials: string;
  score: number;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function qualifiesForHighScore(entries: readonly HighScoreEntry[], score: number): boolean {
  if (!isScore(score)) return false;
  return entries.length < HIGH_SCORE_LIMIT || score > entries[entries.length - 1]!.score;
}

export function insertHighScore(
  entries: readonly HighScoreEntry[],
  entry: HighScoreEntry,
): HighScoreEntry[] {
  if (!isEntry(entry) || !qualifiesForHighScore(entries, entry.score)) return [...entries];

  const next = [...entries];
  const index = next.findIndex((existing) => existing.score < entry.score);
  next.splice(index < 0 ? next.length : index, 0, { ...entry });
  return next.slice(0, HIGH_SCORE_LIMIT);
}

export function loadHighScores(getStorage: () => KeyValueStorage | undefined): HighScoreEntry[] {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > HIGH_SCORE_LIMIT || !parsed.every(isEntry)) return [];
    if (!isSorted(parsed)) return [];
    return parsed.map((entry) => ({ ...entry }));
  } catch {
    return [];
  }
}

export function saveHighScores(
  getStorage: () => KeyValueStorage | undefined,
  entries: readonly HighScoreEntry[],
): void {
  try {
    if (entries.length > HIGH_SCORE_LIMIT || !entries.every(isEntry) || !isSorted(entries)) return;
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Persistence is optional; storage failures must never interrupt play.
  }
}

function isEntry(value: unknown): value is HighScoreEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.initials === "string"
    && /^[A-Z]{0,3}$/.test(entry.initials)
    && isScore(entry.score);
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isSorted(entries: readonly HighScoreEntry[]): boolean {
  return entries.every((entry, index) => index === 0 || entries[index - 1]!.score >= entry.score);
}

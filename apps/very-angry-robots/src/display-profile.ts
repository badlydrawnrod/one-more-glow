import type { DisplayProfile } from "one-more-glow";

const STORAGE_KEY = "one-more-glow-very-angry-robots-display-profile";

export const ROBOTS_DEFAULT_DISPLAY_PROFILE: Readonly<DisplayProfile> = Object.freeze({
  lineWidth: 1.0,
  pointRadius: 1.0,
  glowStrength: 0.2,
  glowSpread: 1.0,
});

export interface ProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isDisplayProfile(value: unknown): value is DisplayProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return Number.isFinite(profile.lineWidth) && (profile.lineWidth as number) >= 0.5 && (profile.lineWidth as number) <= 4
    && Number.isFinite(profile.pointRadius) && (profile.pointRadius as number) >= 0.5 && (profile.pointRadius as number) <= 4
    && Number.isFinite(profile.glowStrength) && (profile.glowStrength as number) >= 0 && (profile.glowStrength as number) <= 2
    && Number.isFinite(profile.glowSpread) && (profile.glowSpread as number) >= 0.5 && (profile.glowSpread as number) <= 2;
}

export function readDisplayProfile(getStorage: () => ProfileStorage): DisplayProfile {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    if (raw === null) return { ...ROBOTS_DEFAULT_DISPLAY_PROFILE };
    const parsed: unknown = JSON.parse(raw);
    return isDisplayProfile(parsed) ? { ...parsed } : { ...ROBOTS_DEFAULT_DISPLAY_PROFILE };
  } catch {
    return { ...ROBOTS_DEFAULT_DISPLAY_PROFILE };
  }
}

export function writeDisplayProfile(getStorage: () => ProfileStorage, profile: Readonly<DisplayProfile>): void {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Session tuning still works when browser storage is unavailable.
  }
}

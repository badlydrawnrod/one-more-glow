export interface AudioPreferences {
  enabled: boolean;
  volume: number;
}

export interface AudioStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type AudioEffect =
  | "player-shot"
  | "robot-shot"
  | "robot-destroyed"
  | "room-cleared"
  | "player-defeated"
  | "player-hazard"
  | "robot-hazard"
  | "room-entered"
  | "extra-life"
  | "interface";

export type TauntSet = "standard" | "chicken";
export type SpokenClip = "captain-entry" | "retreat";

export interface AudioController {
  readonly preferences: Readonly<AudioPreferences>;
  setPreferences(preferences: AudioPreferences): void;
  unlock(): void;
  playEffects(effects: readonly AudioEffect[]): void;
  playVoice(clip: SpokenClip): void;
  startTaunts(set: TauntSet): void;
  stopTaunts(): void;
  setGameplayState(active: boolean, paused: boolean): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}

interface AudioControllerOptions {
  getStorage?: () => AudioStorage | undefined;
  createAudio?: (source: string) => HTMLAudioElement;
  baseUrl?: string;
  random?: () => number;
  now?: () => number;
}

const STORAGE_KEY = "one-more-glow-very-angry-robots-audio-preferences";
const DEFAULT_AUDIO_PREFERENCES: Readonly<AudioPreferences> = Object.freeze({ enabled: true, volume: 1 });
const MAX_ACTIVE_EFFECTS = 8;
const SHOT_RETRIGGER_MS = 90;
const HAZARD_RETRIGGER_MS = 140;
const GENERAL_RETRIGGER_MS = 60;
const TAUNT_MIN_SECONDS = 2.5;
const TAUNT_MAX_SECONDS = 15;

const EFFECT_SOURCES: Readonly<Record<AudioEffect, string>> = {
  "player-shot": "hit02.ogg",
  "robot-shot": "hit02.ogg",
  "robot-destroyed": "hit01.ogg",
  "room-cleared": "hit03.ogg",
  "player-defeated": "hit02.ogg",
  "player-hazard": "buzz05.ogg",
  "robot-hazard": "buzz01.ogg",
  "room-entered": "electrifying01.ogg",
  "extra-life": "pickup.ogg",
  interface: "bleep.ogg",
};

const STANDARD_TAUNTS = [
  "standard_taunts/attack_it.ogg",
  "standard_taunts/attack_the_humanoid.ogg",
  "standard_taunts/attack_the_intruder.ogg",
  "standard_taunts/charge_it.ogg",
  "standard_taunts/charge_the_humanoid.ogg",
  "standard_taunts/charge_the_intruder.ogg",
  "standard_taunts/destroy_it.ogg",
  "standard_taunts/destroy_the_humanoid.ogg",
  "standard_taunts/destroy_the_intruder.ogg",
  "standard_taunts/get_it.ogg",
  "standard_taunts/get_the_humanoid.ogg",
  "standard_taunts/get_the_intruder.ogg",
  "standard_taunts/kill_it.ogg",
  "standard_taunts/kill_the_humanoid.ogg",
  "standard_taunts/kill_the_intruder.ogg",
] as const;

const CHICKEN_TAUNTS = [
  "chicken_taunts/attack_the_chicken.ogg",
  "chicken_taunts/charge_the_chicken.ogg",
  "chicken_taunts/destroy_the_chicken.ogg",
  "chicken_taunts/get_the_chicken.ogg",
  "chicken_taunts/kill_the_chicken.ogg",
] as const;

interface QueuedVoice {
  source: string;
  taunt: boolean;
}

function browserStorage(): AudioStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function isAudioPreferences(value: unknown): value is AudioPreferences {
  if (typeof value !== "object" || value === null) return false;
  const preferences = value as Record<string, unknown>;
  return typeof preferences.enabled === "boolean"
    && typeof preferences.volume === "number"
    && Number.isFinite(preferences.volume)
    && preferences.volume >= 0
    && preferences.volume <= 1;
}

export function readAudioPreferences(
  getStorage: () => AudioStorage | undefined = browserStorage,
): AudioPreferences {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return { ...DEFAULT_AUDIO_PREFERENCES };
    const parsed: unknown = JSON.parse(raw);
    return isAudioPreferences(parsed) ? { ...parsed } : { ...DEFAULT_AUDIO_PREFERENCES };
  } catch {
    return { ...DEFAULT_AUDIO_PREFERENCES };
  }
}

export function writeAudioPreferences(
  getStorage: () => AudioStorage | undefined,
  preferences: Readonly<AudioPreferences>,
): void {
  try {
    if (!isAudioPreferences(preferences)) return;
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Current-session audio preferences still work when storage is unavailable.
  }
}

function audioUrl(source: string, baseUrl: string): string {
  return `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}audio/${source}`;
}

function tauntInterval(random: () => number): number {
  const value = random();
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  return TAUNT_MIN_SECONDS + normalized * (TAUNT_MAX_SECONDS - TAUNT_MIN_SECONDS);
}

function voiceSource(clip: SpokenClip): string {
  return clip === "captain-entry" ? "captain_enter_room_speech.ogg" : "exit_room_as_chicken_speech.ogg";
}

export function createAudioController(options: AudioControllerOptions = {}): AudioController {
  const getStorage = options.getStorage ?? browserStorage;
  const createAudio = options.createAudio ?? ((source) => new Audio(source));
  const baseUrl = options.baseUrl ?? "/";
  const random = options.random ?? Math.random;
  const now = options.now ?? (() => performance.now());

  let preferences = readAudioPreferences(getStorage);
  let unlocked = false;
  let gameplayActive = false;
  let paused = false;
  let disposed = false;
  let tauntSet: TauntSet | null = null;
  let tauntRemaining: number | null = null;
  let tauntWaitingForVoice = false;
  let currentVoice: HTMLAudioElement | null = null;
  let voiceQueue: QueuedVoice[] = [];
  let lastEffectAt = new Map<string, number>();
  let activeEffects: HTMLAudioElement[] = [];

  function canPlay(): boolean {
    return !disposed && unlocked && preferences.enabled && preferences.volume > 0;
  }

  function cleanupEffect(audio: HTMLAudioElement): void {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    activeEffects = activeEffects.filter((effect) => effect !== audio);
  }

  function stopEffects(): void {
    for (const effect of [...activeEffects]) cleanupEffect(effect);
    activeEffects = [];
  }

  function stopVoice(): void {
    if (!currentVoice) return;
    const voice = currentVoice;
    currentVoice = null;
    voice.onended = null;
    voice.onerror = null;
    voice.pause();
    voice.removeAttribute("src");
    voice.load();
  }

  function stopPlayback(): void {
    stopEffects();
    stopVoice();
    voiceQueue = [];
    tauntWaitingForVoice = false;
  }

  function playAudio(source: string, volume: number, ended: () => void, failed: () => void): HTMLAudioElement | null {
    if (!canPlay()) return null;
    let audio: HTMLAudioElement;
    try {
      audio = createAudio(audioUrl(source, baseUrl));
      audio.preload = "auto";
      audio.volume = Math.max(0, Math.min(1, preferences.volume * volume));
      audio.onended = ended;
      audio.onerror = failed;
      const result = audio.play();
      if (result && typeof result.catch === "function") void result.catch(failed);
      return audio;
    } catch {
      failed();
      return null;
    }
  }

  function scheduleTauntAfterVoice(): void {
    if (!tauntSet || !gameplayActive || paused || !preferences.enabled) return;
    tauntRemaining = tauntInterval(random);
    tauntWaitingForVoice = false;
  }

  function startNextVoice(): void {
    if (currentVoice || !canPlay() || !gameplayActive || paused) return;
    const next = voiceQueue.shift();
    if (!next) {
      if (tauntWaitingForVoice) scheduleTauntAfterVoice();
      return;
    }

    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      currentVoice = null;
      if (next.taunt) scheduleTauntAfterVoice();
      startNextVoice();
    };
    const audio = playAudio(next.source, 1, finish, finish);
    if (!audio) {
      finish();
      return;
    }
    currentVoice = audio;
  }

  function queueVoice(source: string, taunt: boolean): void {
    if (!canPlay() || !gameplayActive || paused) return;
    voiceQueue.push({ source, taunt });
    startNextVoice();
  }

  function playDueTaunt(): void {
    if (!tauntSet) return;
    if (currentVoice || voiceQueue.length > 0) {
      tauntWaitingForVoice = true;
      tauntRemaining = null;
      return;
    }
    const clips = tauntSet === "standard" ? STANDARD_TAUNTS : CHICKEN_TAUNTS;
    const index = Math.min(clips.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * clips.length));
    queueVoice(clips[index]!, true);
  }

  function setPreferences(next: AudioPreferences): void {
    if (!isAudioPreferences(next)) return;
    preferences = { ...next };
    writeAudioPreferences(getStorage, preferences);
    if (!preferences.enabled || preferences.volume === 0) {
      stopPlayback();
      if (tauntSet && gameplayActive && !paused) tauntRemaining = tauntInterval(random);
    }
  }

  return {
    get preferences() {
      return { ...preferences };
    },

    setPreferences,

    unlock() {
      if (!disposed) unlocked = true;
    },

    playEffects(effects) {
      if (!canPlay()) return;
      const seen = new Set<string>();
      const at = now();
      for (const effect of effects) {
        if (effect !== "interface" && (!gameplayActive || paused)) continue;
        const coalesceKey = effect === "player-shot" || effect === "robot-shot" ? "shot" : effect;
        if (seen.has(coalesceKey)) continue;
        seen.add(coalesceKey);
        const interval = coalesceKey === "shot" ? SHOT_RETRIGGER_MS
          : coalesceKey === "player-hazard" || coalesceKey === "robot-hazard" ? HAZARD_RETRIGGER_MS
            : GENERAL_RETRIGGER_MS;
        const previousAt = lastEffectAt.get(coalesceKey);
        if (previousAt !== undefined && at - previousAt < interval) continue;
        lastEffectAt.set(coalesceKey, at);
        if (activeEffects.length >= MAX_ACTIVE_EFFECTS) cleanupEffect(activeEffects[0]!);

        let audio: HTMLAudioElement | null = null;
        const finish = () => {
          if (!audio) return;
          cleanupEffect(audio);
        };
        audio = playAudio(EFFECT_SOURCES[effect], effect === "player-shot" || effect === "robot-shot" ? 0.24 : 0.55,
          finish, finish);
        if (audio) activeEffects.push(audio);
      }
    },

    playVoice(clip) {
      queueVoice(voiceSource(clip), false);
    },

    startTaunts(set) {
      tauntSet = set;
      tauntWaitingForVoice = false;
      tauntRemaining = tauntInterval(random);
    },

    stopTaunts() {
      tauntSet = null;
      tauntRemaining = null;
      tauntWaitingForVoice = false;
      voiceQueue = voiceQueue.filter((voice) => !voice.taunt);
      if (currentVoice && (currentVoice.src.includes("/standard_taunts/") || currentVoice.src.includes("/chicken_taunts/"))) {
        stopVoice();
      }
    },

    setGameplayState(active, nextPaused) {
      const wasActive = gameplayActive;
      const wasPaused = paused;
      gameplayActive = active;
      paused = nextPaused;
      if (!active && wasActive) {
        stopPlayback();
        tauntSet = null;
        tauntRemaining = null;
        return;
      }
      if (active && paused && !wasPaused) {
        stopPlayback();
        if (tauntSet) tauntRemaining = null;
      } else if (active && !paused && wasPaused && tauntSet) {
        tauntRemaining = tauntInterval(random);
      }
    },

    update(deltaSeconds) {
      if (!canPlay() || !gameplayActive || paused || !tauntSet || tauntWaitingForVoice) return;
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
      if (tauntRemaining === null) tauntRemaining = tauntInterval(random);
      tauntRemaining -= deltaSeconds;
      if (tauntRemaining <= 0) playDueTaunt();
    },

    dispose() {
      if (disposed) return;
      stopPlayback();
      disposed = true;
      lastEffectAt = new Map();
      tauntSet = null;
      tauntRemaining = null;
    },
  };
}

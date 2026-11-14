import type { GameScreen } from "./screen-flow.ts";

/** Keep modal and pause gates in one small, deterministic boundary for the app loop. */
export function canOpenDisplaySettings(screen: GameScreen, paused: boolean): boolean {
  return screen === "main-menu" || screen === "top-scores" || (screen === "playing" && paused);
}

export function pauseAfterFocusLoss(screen: GameScreen, alreadyPaused: boolean): boolean {
  return screen === "playing" || alreadyPaused;
}

export function focusLossOverlayState(
  screen: GameScreen,
  paused: boolean,
  settingsOpen: boolean,
): { paused: boolean; settingsOpen: boolean } {
  return { paused: pauseAfterFocusLoss(screen, paused), settingsOpen };
}

export function shouldAdvanceGame(screen: GameScreen, paused: boolean, settingsOpen: boolean): boolean {
  return screen === "playing" && !paused && !settingsOpen;
}

export function shouldAdvanceSceneTime(screen: GameScreen, paused: boolean, settingsOpen: boolean): boolean {
  return shouldAdvanceGame(screen, paused, settingsOpen);
}

export function shouldTickAttractScreen(screen: GameScreen, settingsOpen: boolean): boolean {
  return !settingsOpen && (screen === "main-menu" || screen === "top-scores");
}

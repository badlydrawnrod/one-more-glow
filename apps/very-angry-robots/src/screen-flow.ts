export const ATTRACT_SCREEN_DURATION_MS = 30_000;

export type GameScreen = "main-menu" | "initials" | "top-scores" | "playing";

export interface ScreenFlow {
  screen: GameScreen;
  /** Time spent on the current Main Menu or Top Scores screen. */
  elapsedMs: number;
  /** Final score for the run that just ended, retained for table insertion. */
  runScore: number | null;
  /** Initials submitted for the current run, retained for table insertion. */
  submittedInitials: string | null;
}

export type ScreenFlowAction =
  | { type: "run-ended"; score: number; qualifies: boolean }
  | { type: "initials-submitted"; initials: string }
  | { type: "advance" }
  | { type: "tick"; elapsedMs: number }
  | { type: "start-run" };

/** Start the app on the attract-mode Main Menu. */
export function createScreenFlow(): ScreenFlow {
  return {
    screen: "main-menu",
    elapsedMs: 0,
    runScore: null,
    submittedInitials: null,
  };
}

function otherAttractScreen(screen: "main-menu" | "top-scores"): "main-menu" | "top-scores" {
  return screen === "main-menu" ? "top-scores" : "main-menu";
}

/** Apply one UI-flow event and return the next state. */
export function updateScreenFlow(
  flow: ScreenFlow,
  action: ScreenFlowAction,
): ScreenFlow {
  switch (action.type) {
    case "start-run":
      if (flow.screen !== "main-menu" && flow.screen !== "top-scores") return flow;
      return { screen: "playing", elapsedMs: 0, runScore: null, submittedInitials: null };

    case "run-ended":
      if (flow.screen !== "playing") return flow;
      return {
        screen: action.qualifies ? "initials" : "top-scores",
        elapsedMs: 0,
        runScore: action.score,
        submittedInitials: null,
      };

    case "initials-submitted":
      if (flow.screen !== "initials") return flow;
      return { ...flow, screen: "top-scores", elapsedMs: 0, submittedInitials: action.initials };

    case "advance":
      if (flow.screen !== "main-menu" && flow.screen !== "top-scores") return flow;
      return { ...flow, screen: otherAttractScreen(flow.screen), elapsedMs: 0 };

    case "tick": {
      if (flow.screen !== "main-menu" && flow.screen !== "top-scores") return flow;
      if (!Number.isFinite(action.elapsedMs) || action.elapsedMs <= 0) return flow;
      const totalElapsed = flow.elapsedMs + action.elapsedMs;
      const screenChanges = Math.floor(totalElapsed / ATTRACT_SCREEN_DURATION_MS);
      const elapsedMs = totalElapsed % ATTRACT_SCREEN_DURATION_MS;
      const screen = screenChanges % 2 === 0 ? flow.screen : otherAttractScreen(flow.screen);
      return { ...flow, screen, elapsedMs };
    }
  }
}

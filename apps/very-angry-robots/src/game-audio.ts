import type { AudioEffect, SpokenClip, TauntSet } from "./audio.ts";
import type { GameEvent } from "./game.ts";

export interface GameAudioActions {
  effects: AudioEffect[];
  voices: SpokenClip[];
  stopTaunts: boolean;
  tauntSet: TauntSet | null;
}

/** Translate resolved simulation events into presentation-only audio requests. */
export function gameAudioActions(events: readonly GameEvent[]): GameAudioActions {
  const actions: GameAudioActions = { effects: [], voices: [], stopTaunts: false, tauntSet: null };
  for (const event of events) {
    switch (event.type) {
      case "player-shot": actions.effects.push("player-shot"); break;
      case "robot-shot": actions.effects.push("robot-shot"); break;
      case "robot-destroyed": actions.effects.push("robot-destroyed"); break;
      case "room-cleared": actions.effects.push("room-cleared"); break;
      case "player-defeated":
        actions.effects.push("player-defeated");
        actions.stopTaunts = true;
        break;
      case "player-hazard": actions.effects.push("player-hazard"); break;
      case "robot-hazard": actions.effects.push("robot-hazard"); break;
      case "room-entered":
        actions.effects.push("room-entered");
        break;
      case "captain-entered": actions.voices.push("captain-entry"); break;
      case "player-respawned":
        actions.effects.push("room-entered");
        break;
      case "extra-life": actions.effects.push("extra-life"); break;
      case "room-retreated":
        actions.voices.push("retreat");
        actions.stopTaunts = true;
        actions.tauntSet = "chicken";
        break;
      case "shot-impact": break;
    }
  }
  return actions;
}

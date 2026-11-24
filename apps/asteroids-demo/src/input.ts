import {
  InputDevices,
  type DeviceInputFrame,
  type GamepadSnapshot,
} from "@one-more-glow/game-input";
import type { InputFrame, Screen } from "./game.ts";

type BrowserKey = Pick<KeyboardEvent, "code" | "key" | "repeat">;
type BrowserGamepad = Pick<Gamepad, "index" | "id" | "mapping" | "connected" | "axes" | "buttons">;
type BrowserGamepads = readonly (BrowserGamepad | null)[];
type SettingsKey = BrowserKey & Pick<KeyboardEvent, "shiftKey">;

export function settingsKeyAction(event: SettingsKey): "previous" | "next" | "decrease" | "increase" | "activate" | "close" | undefined {
  switch (event.code) {
    case "ArrowUp": return "previous";
    case "ArrowDown": return "next";
    case "Tab": return event.shiftKey ? "previous" : "next";
    case "ArrowLeft": return "decrease";
    case "ArrowRight": return "increase";
    case "Enter":
    case "NumpadEnter":
    case "Space": return event.repeat ? undefined : "activate";
    case "Escape": return event.repeat ? undefined : "close";
  }
}

export function preventsGameplayDefault(code: string): boolean {
  return gameplayCodes.has(code);
}

export function canOpenSettings(screen: Screen): boolean {
  return screen === "title" || screen === "paused";
}

export function inputDestination(screen: Screen, settingsOpen: boolean, frame: DeviceInputFrame) {
  if (settingsOpen) return "settings";
  if (canOpenSettings(screen) && frame.gamepads[0]?.buttonsPressed.has(8)) return "open-settings";
  return "gameplay";
}

const gameplayCodes = new Set([
  "ArrowLeft", "ArrowRight", "ArrowUp", "KeyA", "KeyD", "KeyW", "Space",
  "ShiftLeft", "ShiftRight", "Enter", "NumpadEnter", "KeyP", "Escape",
]);

function physicalCode(code: string): string | null {
  return code === "" || code === "Unidentified" ? null : code;
}

const turnActive = (axis: number) => Math.abs(axis) > 0.16;
const thrustActive = (axis: number) => axis < -0.35;

export class InputController {
  private readonly devices = new InputDevices();
  private readonly connections = new Map<number, { id: string; mapping: string; token: string }>();
  private readonly gatedAxes = new Map<string, Set<number>>();
  private nextToken = 0;
  private gateOnReturn = false;

  keyDown(event: BrowserKey): boolean {
    if (!preventsGameplayDefault(event.code)) return false;
    this.devices.keyDown(physicalCode(event.code), event.key, event.repeat);
    return true;
  }

  keyUp(event: BrowserKey): void {
    this.devices.keyUp(physicalCode(event.code), event.key);
  }

  blockKey(event: BrowserKey): void {
    this.devices.blockKeyUntilReleased(physicalCode(event.code), event.key);
  }

  forgetConnection(index: number): void {
    const connection = this.connections.get(index);
    if (connection) this.gatedAxes.delete(connection.token);
    this.connections.delete(index);
  }

  loseFocus(): void {
    this.devices.clearKeyboard();
    this.connections.clear();
    this.gatedAxes.clear();
    this.gateOnReturn = true;
  }

  suppressAtSettingsTransition(gamepads: BrowserGamepads): void {
    this.devices.suppressKeyboardUntilReleased();
    this.suppressGamepads(this.snapshots(gamepads));
  }

  read(gamepads: BrowserGamepads | null): DeviceInputFrame {
    if (gamepads === null) return this.devices.read([]);
    const snapshots = this.snapshots(gamepads);
    if (this.gateOnReturn) {
      this.suppressGamepads(snapshots);
      this.gateOnReturn = false;
    }
    const frame = this.devices.read(snapshots);
    for (const { connectionId, axes } of frame.gamepads) {
      const blocked = this.gatedAxes.get(connectionId);
      if (!blocked) continue;
      if (!turnActive(axes[0] ?? 0)) blocked.delete(0);
      if (!thrustActive(axes[1] ?? 0)) blocked.delete(1);
      if (blocked.size === 0) this.gatedAxes.delete(connectionId);
    }
    return frame;
  }

  gameplay(screen: Screen, frame: DeviceInputFrame): InputFrame {
    const pad = frame.gamepads[0];
    const keyDown = (code: string) => frame.keyboard.down.some((entry) => entry.code === code);
    const keyPressed = (code: string) => frame.keyboard.pressed.some((entry) => entry.code === code);
    const buttonDown = (index: number) => pad?.buttonsDown.has(index) ?? false;
    const buttonPressed = (index: number) => pad?.buttonsPressed.has(index) ?? false;
    const blockedAxes = pad && this.gatedAxes.get(pad.connectionId);
    const horizontal = pad?.axes[0] ?? 0;
    const vertical = pad?.axes[1] ?? 0;
    const keyboardTurn = Number(keyDown("ArrowRight") || keyDown("KeyD"))
      - Number(keyDown("ArrowLeft") || keyDown("KeyA"));
    const stickTurn = !blockedAxes?.has(0) && turnActive(horizontal) ? horizontal : 0;
    const dpadTurn = Number(buttonDown(15)) - Number(buttonDown(14));
    const menu = screen === "title" || screen === "gameover";
    const start = buttonPressed(9);
    return {
      turn: Math.max(-1, Math.min(1, keyboardTurn + (stickTurn || dpadTurn))),
      thrust: keyDown("ArrowUp") || keyDown("KeyW")
        || (!blockedAxes?.has(1) && thrustActive(vertical)) || buttonDown(12) || buttonDown(0),
      fire: keyDown("Space") || buttonDown(1),
      hyperspacePressed: keyPressed("ShiftLeft") || keyPressed("ShiftRight") || buttonPressed(2),
      startPressed: menu && (keyPressed("Enter") || keyPressed("NumpadEnter") || start),
      pausePressed: keyPressed("KeyP") || (!menu && start),
      titlePressed: keyPressed("Escape") || (screen === "gameover" && buttonPressed(1)),
      connected: pad !== undefined,
    };
  }

  private snapshots(gamepads: BrowserGamepads): GamepadSnapshot[] {
    const snapshots: GamepadSnapshot[] = [];
    const seen = new Set<number>();
    for (const pad of gamepads) {
      if (!pad?.connected) continue;
      seen.add(pad.index);
      let connection = this.connections.get(pad.index);
      if (connection?.id !== pad.id || connection.mapping !== pad.mapping) {
        this.forgetConnection(pad.index);
        connection = { id: pad.id, mapping: pad.mapping, token: String(++this.nextToken) };
        this.connections.set(pad.index, connection);
      }
      snapshots.push({
        connectionId: connection.token,
        axes: Array.from(pad.axes),
        buttons: Array.from(pad.buttons, (button) => button.pressed),
      });
    }
    for (const index of this.connections.keys()) {
      if (!seen.has(index)) this.forgetConnection(index);
    }
    return snapshots;
  }

  private suppressGamepads(snapshots: readonly GamepadSnapshot[]): void {
    for (const snapshot of snapshots) {
      this.devices.suppressGamepadButtonsWhileHeld(snapshot);
      const blocked = new Set<number>();
      if (turnActive(snapshot.axes[0] ?? 0)) blocked.add(0);
      if (thrustActive(snapshot.axes[1] ?? 0)) blocked.add(1);
      if (blocked.size > 0) this.gatedAxes.set(snapshot.connectionId, blocked);
      else this.gatedAxes.delete(snapshot.connectionId);
    }
  }
}

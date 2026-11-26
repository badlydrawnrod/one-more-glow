import { InputDevices, type DeviceInputFrame, type GamepadSnapshot } from "@one-more-glow/game-input";

type BrowserKey = Pick<KeyboardEvent, "code" | "key" | "repeat">;
type BrowserGamepad = Pick<Gamepad, "index" | "id" | "mapping" | "connected" | "axes" | "buttons">;

export interface GameplayInput {
  turn: number;
  fire: boolean;
  connected: boolean;
  restartPressed: boolean;
}

const gameplayKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "a", "d", "z", " "]);

function physicalCode(code: string): string | null {
  return code === "" || code === "Unidentified" ? null : code;
}

export class GyrussInput {
  private readonly devices = new InputDevices();
  private readonly connections = new Map<number, { id: string; mapping: string; token: string }>();
  private nextToken = 0;
  private selectedToken: string | null = null;
  private neutralSince: number | null = null;
  private gated = true;
  private selectedPad: BrowserGamepad | null = null;

  keyDown(event: BrowserKey): boolean {
    this.devices.keyDown(physicalCode(event.code), event.key, event.repeat);
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    return gameplayKeys.has(key);
  }

  keyUp(event: Omit<BrowserKey, "repeat">): void {
    this.devices.keyUp(physicalCode(event.code), event.key);
  }

  clearKeyboard(): void {
    this.devices.clearKeyboard();
  }

  blur(): void {
    this.clearKeyboard();
    this.gated = true;
    this.neutralSince = null;
  }

  forgetConnection(index: number): void {
    this.connections.delete(index);
  }

  read(gamepads: ArrayLike<BrowserGamepad | null>): DeviceInputFrame {
    const snapshots: GamepadSnapshot[] = [];
    const seen = new Set<number>();
    this.selectedPad = null;
    for (const pad of Array.from(gamepads)) {
      if (!pad?.connected) continue;
      this.selectedPad ??= pad;
      seen.add(pad.index);
      let connection = this.connections.get(pad.index);
      if (!connection || connection.id !== pad.id || connection.mapping !== pad.mapping) {
        connection = { id: pad.id, mapping: pad.mapping, token: String(++this.nextToken) };
        this.connections.set(pad.index, connection);
      }
      snapshots.push({
        connectionId: connection.token,
        axes: pad.axes,
        buttons: Array.from(pad.buttons, (button) => button.pressed),
      });
    }
    for (const index of this.connections.keys()) {
      if (!seen.has(index)) this.forgetConnection(index);
    }
    return this.devices.read(snapshots);
  }

  controls(frame: DeviceInputFrame, time: number, focused: boolean): GameplayInput {
    const pad = frame.gamepads[0];
    if ((pad?.connectionId ?? null) !== this.selectedToken) {
      this.selectedToken = pad?.connectionId ?? null;
      this.gated = true;
      this.neutralSince = null;
    }
    if (!focused) {
      this.gated = true;
      this.neutralSince = null;
    } else if (this.gated && this.selectedPad) {
      const neutral = this.selectedPad.buttons.every((button) => !button.pressed)
        && Math.abs(this.selectedPad.axes[0] ?? 0) <= 0.16;
      if (!neutral) this.neutralSince = null;
      else if (this.neutralSince === null) this.neutralSince = time;
      else if (time - this.neutralSince >= 100) this.gated = false;
    }
    const result = gameplay(frame);
    if (this.gated && pad) {
      const keyboard = gameplay({ ...frame, gamepads: [] });
      return { ...keyboard, connected: true };
    }
    return result;
  }
}

export function gameplay(frame: DeviceInputFrame): GameplayInput {
  const pad = frame.gamepads[0];
  const keyDown = (key: string) => frame.keyboard.down.some((entry) => entry.key === key);
  const buttonDown = (index: number) => pad?.buttonsDown.has(index) ?? false;
  const keyboardTurn = Number(keyDown("ArrowRight") || keyDown("d"))
    - Number(keyDown("ArrowLeft") || keyDown("a"));
  const axis = pad?.axes[0] ?? 0;
  const stickTurn = Math.abs(axis) > 0.16 ? axis : 0;
  const dpadTurn = Number(buttonDown(15)) - Number(buttonDown(14));
  return {
    turn: Math.max(-1, Math.min(1, keyboardTurn + (stickTurn || dpadTurn))),
    fire: keyDown(" ") || keyDown("ArrowUp") || keyDown("z") || buttonDown(0),
    connected: pad !== undefined,
    restartPressed: frame.keyboard.pressed.some((entry) => entry.key === "r"),
  };
}

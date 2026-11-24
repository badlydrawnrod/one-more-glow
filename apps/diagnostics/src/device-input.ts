import { InputDevices, type DeviceInputFrame, type GamepadSnapshot } from "@one-more-glow/game-input";

type GamepadDevice = Pick<Gamepad, "index" | "id" | "mapping" | "connected" | "axes" | "buttons">;

export function isGamepadNeutral(gamepad: GamepadDevice): boolean {
  const buttonsNeutral = Array.from(gamepad.buttons).every((button) => !button.pressed);
  const axesNeutral = (gamepad.axes[0] ?? 0) ** 2 + (gamepad.axes[1] ?? 0) ** 2 < 0.25 ** 2;
  return buttonsNeutral && axesNeutral;
}

export class DiagnosticsDeviceInput {
  private readonly devices = new InputDevices();
  private readonly connections = new Map<number, { id: string; token: string }>();
  private nextConnectionToken = 1;
  private cachedSnapshots: GamepadSnapshot[] = [];

  keyDown(code: string | null, key: string, repeat: boolean): void {
    this.devices.keyDown(code, key, repeat);
  }

  keyUp(code: string | null, key: string): void {
    this.devices.keyUp(code, key);
  }

  clearKeyboard(): void {
    this.devices.clearKeyboard();
  }

  gamepadConnected(index: number): void {
    this.connections.delete(index);
  }

  gamepadDisconnected(index: number): void {
    this.connections.delete(index);
  }

  read(gamepads: readonly (GamepadDevice | null)[]): {
    frame: DeviceInputFrame;
    gamepad: GamepadDevice | null;
  } {
    const gamepad = gamepads.find((candidate) => candidate?.connected && candidate.mapping === "standard") ?? null;
    this.cachedSnapshots = gamepad ? [this.snapshotFor(gamepad)] : [];
    return { frame: this.devices.read(this.cachedSnapshots), gamepad };
  }

  readCached(): DeviceInputFrame {
    return this.devices.read(this.cachedSnapshots);
  }

  resetGamepads(): void {
    this.cachedSnapshots = [];
    this.devices.read([]);
  }

  private snapshotFor(gamepad: GamepadDevice): GamepadSnapshot {
    let connection = this.connections.get(gamepad.index);
    if (!connection || connection.id !== gamepad.id) {
      connection = { id: gamepad.id, token: `diagnostics-gamepad-${this.nextConnectionToken++}` };
      this.connections.set(gamepad.index, connection);
    }
    return {
      connectionId: connection.token,
      axes: Array.from(gamepad.axes),
      buttons: Array.from(gamepad.buttons, (button) => button.pressed),
    };
  }
}

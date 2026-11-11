import type { InputFrame, Screen } from "./game.ts";

const continuousKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "a", "d", "w", " ", "Shift"]);
const discreteKeys = new Set(["Enter", "p", "Shift"]);

export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

export class InputController {
  private readonly keys = new Set<string>();
  private readonly keyEdges = new Set<string>();
  private readonly blockedKeys = new Set<string>();
  private readonly previousPadButtons = new Map<number, boolean>();
  private readonly blockedPadButtons = new Set<number>();
  private readonly blockedPadAxes = new Set<number>();

  keyDown(rawKey: string, repeat: boolean): boolean {
    const key = normalizeKey(rawKey);
    if (this.blockedKeys.has(key)) return continuousKeys.has(key) || discreteKeys.has(key);
    if (discreteKeys.has(key) && !repeat) this.keyEdges.add(key);
    if (continuousKeys.has(key) || discreteKeys.has(key)) this.keys.add(key);
    return continuousKeys.has(key) || discreteKeys.has(key);
  }

  keyUp(rawKey: string): void {
    const key = normalizeKey(rawKey);
    this.keys.delete(key);
    this.blockedKeys.delete(key);
  }

  blockKey(rawKey: string): void {
    const key = normalizeKey(rawKey);
    if (continuousKeys.has(key) || discreteKeys.has(key)) this.blockedKeys.add(key);
  }

  clear(): void {
    this.keys.clear();
    this.keyEdges.clear();
    this.blockedKeys.clear();
    this.previousPadButtons.clear();
    this.blockedPadButtons.clear();
    this.blockedPadAxes.clear();
  }

  clearKeyboard(): void {
    for (const key of this.keys) this.blockedKeys.add(key);
    this.keys.clear();
    this.keyEdges.clear();
  }

  /** Consume inputs used by a modal and require every held gamepad control to be released. */
  suppressWhileModal(gamepads: readonly (Gamepad | null)[]): void {
    const pad = gamepads.find((candidate) => candidate?.connected) ?? null;
    if (!pad) {
      this.previousPadButtons.clear();
      this.blockedPadButtons.clear();
      this.blockedPadAxes.clear();
      return;
    }
    for (let index = 0; index < pad.buttons.length; index += 1) {
      const pressed = pad.buttons[index]?.pressed ?? false;
      if (pressed) this.blockedPadButtons.add(index);
      if (index === 2 || index === 9) this.previousPadButtons.set(index, pressed);
    }
    if (Math.abs(pad.axes[0] ?? 0) > 0.16) this.blockedPadAxes.add(0);
    if ((pad.axes[1] ?? 0) < -0.35) this.blockedPadAxes.add(1);
  }

  read(screen: Screen, gamepads: readonly (Gamepad | null)[]): InputFrame {
    const pad = gamepads.find((candidate) => candidate?.connected) ?? null;
    if (!pad) {
      this.previousPadButtons.clear();
      this.blockedPadButtons.clear();
      this.blockedPadAxes.clear();
    }
    for (const index of this.blockedPadButtons) {
      if (!(pad?.buttons[index]?.pressed ?? false)) this.blockedPadButtons.delete(index);
    }
    if (Math.abs(pad?.axes[0] ?? 0) <= 0.16) this.blockedPadAxes.delete(0);
    if ((pad?.axes[1] ?? 0) >= -0.35) this.blockedPadAxes.delete(1);
    const rawButtonPressed = (index: number) => pad?.buttons[index]?.pressed ?? false;
    const buttonPressed = (index: number) => rawButtonPressed(index) && !this.blockedPadButtons.has(index);
    const buttonEdge = (index: number) => {
      const down = rawButtonPressed(index);
      const edge = down && !this.previousPadButtons.get(index);
      this.previousPadButtons.set(index, down);
      return edge && !this.blockedPadButtons.has(index);
    };
    const keyboardTurn = Number(this.keys.has("ArrowRight") || this.keys.has("d"))
      - Number(this.keys.has("ArrowLeft") || this.keys.has("a"));
    const stick = this.blockedPadAxes.has(0) ? 0 : (pad?.axes[0] ?? 0);
    const stickTurn = Math.abs(stick) > 0.16 ? stick : 0;
    const dpadTurn = Number(buttonPressed(15)) - Number(buttonPressed(14));
    const gamepadStart = buttonEdge(9);
    const enter = this.takeKeyEdge("Enter");
    const p = this.takeKeyEdge("p");
    return {
      turn: Math.max(-1, Math.min(1, keyboardTurn + (stickTurn || dpadTurn))),
      thrust: this.keys.has("ArrowUp") || this.keys.has("w") || (pad !== null
      && ((!this.blockedPadAxes.has(1) && (pad.axes[1] ?? 0) < -0.35) || buttonPressed(12) || buttonPressed(0))),
      fire: this.keys.has(" ") || (pad !== null && buttonPressed(1)),
      hyperspacePressed: this.takeKeyEdge("Shift") || (pad !== null && buttonEdge(2)),
      startPressed: enter || ((screen === "title" || screen === "gameover") && gamepadStart),
      pausePressed: p || ((screen !== "title" && screen !== "gameover") && gamepadStart),
      connected: pad !== null,
    };
  }

  private takeKeyEdge(key: string): boolean {
    const edge = this.keyEdges.has(key);
    this.keyEdges.delete(key);
    return edge;
  }
}

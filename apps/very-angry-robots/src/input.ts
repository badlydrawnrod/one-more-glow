import { InputDevices, type GamepadFrame, type GamepadSnapshot } from "@one-more-glow/game-input";

export interface Direction {
  x: number;
  y: number;
}

export type TouchStick = "move" | "aim";

/** Browser-independent state produced by the two virtual sticks. */
export interface TouchInputState {
  move: Direction;
  /** Last non-neutral direction from the aim stick, retained for player facing. */
  aim: Direction;
  /** True only while the aim stick is outside its neutral zone. */
  fire: boolean;
}

export interface InputState {
  move: Direction;
  aim: Direction;
  /** True for one read only when Enter or gamepad Start has just been pressed. */
  startPressed: boolean;
  /** True for one read only when P or gamepad Start has just been pressed. */
  pausePressed: boolean;
  /** True for one read only when S or gamepad Back/Select has just been pressed. */
  settingsPressed: boolean;
  /** True once when a gameplay direction is pressed or a stick leaves neutral. */
  screenAdvancePressed: boolean;
  /** One-step initials slot selection from the left stick's horizontal axis. */
  initialsSlotDelta: -1 | 0 | 1;
  /** One-step initials character cycling from the right stick's vertical axis. */
  initialsCharDelta: -1 | 0 | 1;
}

const MOVEMENT_CODES = ["KeyW", "KeyA", "KeyS", "KeyD"];
const AIM_CODES = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
const DIRECTION_CODES = new Set([...MOVEMENT_CODES, ...AIM_CODES]);
const INPUT_CODES = new Set([...DIRECTION_CODES, "Enter", "NumpadEnter", "KeyP"]);
const GAMEPAD_DEAD_ZONE = 0.2;
const TOUCH_NEUTRAL_ZONE = 0.18;

/**
 * Tracks virtual-stick input without depending on DOM or browser pointer APIs.
 * Coordinates passed to the methods are offsets from the stick's neutral center,
 * normalized so a full stick radius is 1.
 */
export class TouchInputModel {
  private readonly pointerByStick = new Map<TouchStick, number>();
  private readonly directionByStick = new Map<TouchStick, Direction>();
  private readonly stickByPointer = new Map<number, TouchStick>();
  private lastAim: Direction = ZERO;

  /** Assign a pointer to a neutral stick; an already-owned stick is unchanged. */
  pointerDown(stick: TouchStick, pointerId: number, dx: number, dy: number): boolean {
    if (this.pointerByStick.has(stick) || this.stickByPointer.has(pointerId)) return false;
    this.pointerByStick.set(stick, pointerId);
    this.stickByPointer.set(pointerId, stick);
    this.setDirection(stick, dx, dy);
    return true;
  }

  /** Update only the stick owned by this pointer. */
  pointerMove(pointerId: number, dx: number, dy: number): boolean {
    const stick = this.stickByPointer.get(pointerId);
    if (!stick) return false;
    this.setDirection(stick, dx, dy);
    return true;
  }

  /** Release only the stick owned by this pointer. */
  pointerUp(pointerId: number): boolean {
    const stick = this.stickByPointer.get(pointerId);
    if (!stick) return false;
    this.stickByPointer.delete(pointerId);
    this.pointerByStick.delete(stick);
    this.directionByStick.delete(stick);
    return true;
  }

  /** Cancellation releases the pointer just like pointerup, without affecting its peer. */
  pointerCancel(pointerId: number): boolean {
    return this.pointerUp(pointerId);
  }

  /** Release every active pointer, such as when focus is lost or a screen changes. */
  clear(): void {
    this.pointerByStick.clear();
    this.directionByStick.clear();
    this.stickByPointer.clear();
  }

  read(): TouchInputState {
    return {
      move: this.directionByStick.get("move") ?? ZERO,
      aim: this.lastAim,
      fire: Boolean(this.directionByStick.get("aim")),
    };
  }

  private setDirection(stick: TouchStick, dx: number, dy: number): void {
    const direction = quantizeTouchDirection(dx, dy);
    if (direction.x === 0 && direction.y === 0) {
      this.directionByStick.delete(stick);
      return;
    }
    this.directionByStick.set(stick, direction);
    if (stick === "aim") this.lastAim = direction;
  }
}

/** The browser adapter owns tokens because browser indices can be recycled. */
export class GamepadConnections {
  private readonly byIndex = new Map<number, { id: string; connectionId: string }>();
  private nextConnection = 0;

  forget(index: number): void {
    this.byIndex.delete(index);
  }

  clear(): void {
    this.byIndex.clear();
  }

  snapshot(gamepads: readonly (Gamepad | null)[]): GamepadSnapshot[] {
    const snapshots: GamepadSnapshot[] = [];
    const observed = new Set<number>();
    for (const gamepad of gamepads) {
      if (!gamepad?.connected || gamepad.mapping !== "standard") continue;
      observed.add(gamepad.index);
      let connection = this.byIndex.get(gamepad.index);
      if (!connection || connection.id !== gamepad.id) {
        connection = { id: gamepad.id, connectionId: String(this.nextConnection++) };
        this.byIndex.set(gamepad.index, connection);
      }
      snapshots.push({
        connectionId: connection.connectionId,
        axes: [...gamepad.axes],
        buttons: gamepad.buttons.map((button) => button.pressed),
      });
    }
    for (const index of this.byIndex.keys()) {
      if (!observed.has(index)) this.forget(index);
    }
    return snapshots;
  }
}

function physicalCode(code: string): string | null {
  return !code || code === "Unidentified" ? null : code;
}

function stickMagnitude(axes: readonly number[], index: number): number {
  return Math.hypot(axes[index] ?? 0, axes[index + 1] ?? 0);
}

/** Maps the selected standard gamepad and physical keyboard controls to Robots actions. */
export class InputController {
  private readonly devices = new InputDevices();
  private previousGamepadDirection = false;
  private leftStickSlotArmed = true;
  private rightStickCharArmed = true;
  private selectedConnection: string | undefined;
  private readonly blockedSticks = new Map<string, { left: boolean; right: boolean }>();

  keyDown(code: string, key: string, repeat = false): boolean {
    if (!INPUT_CODES.has(code)) return false;
    this.devices.keyDown(code, key, repeat);
    return true;
  }

  keyUp(code: string, key: string): void {
    this.devices.keyUp(physicalCode(code), key);
  }

  blockKey(code: string, key: string): void {
    this.devices.blockKeyUntilReleased(physicalCode(code), key);
  }

  clearForFocusLoss(): void {
    this.devices.clearKeyboard();
    this.blockedSticks.clear();
    this.selectConnection(undefined);
  }

  suppressKeyboardUntilReleased(): void {
    this.devices.suppressKeyboardUntilReleased();
  }

  suppressGamepadWhileHeld(gamepads: readonly GamepadSnapshot[]): void {
    this.updateStickGates(gamepads);
    for (const gamepad of gamepads) {
      this.devices.suppressGamepadButtonsWhileHeld(gamepad);
      this.blockedSticks.set(gamepad.connectionId, {
        left: stickMagnitude(gamepad.axes, 0) > GAMEPAD_DEAD_ZONE,
        right: stickMagnitude(gamepad.axes, 2) > GAMEPAD_DEAD_ZONE,
      });
    }
  }

  read(snapshots: readonly GamepadSnapshot[] = []): InputState & { gamepad: GamepadFrame | undefined } {
    const { keyboard, gamepads } = this.devices.read(snapshots);
    this.updateStickGates(gamepads);
    const gamepad = gamepads[0];
    this.selectConnection(gamepad?.connectionId);
    const keysDown = new Set(keyboard.down.map(({ code }) => code ?? ""));
    const keysPressed = new Set(keyboard.pressed.map(({ code }) => code ?? ""));
    const moveKeys = directionFromKeys(keysDown, "KeyD", "KeyA", "KeyS", "KeyW");
    const aimKeys = directionFromKeys(keysDown, "ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp");
    const axes = gamepad?.axes ?? [];
    const blocked = gamepad && this.blockedSticks.get(gamepad.connectionId);
    const left = blocked?.left ? ZERO : applyDeadZone(axes[0] ?? 0, axes[1] ?? 0);
    const right = blocked?.right ? ZERO : applyDeadZone(axes[2] ?? 0, axes[3] ?? 0);
    const move = combineDirections(moveKeys, left);
    const aim = combineDirections(aimKeys, right);
    const gamepadStartPressed = gamepad?.buttonsPressed.has(9) ?? false;
    const gamepadBackPressed = gamepad?.buttonsPressed.has(8) ?? false;

    const gamepadDirectionActive = left !== ZERO || right !== ZERO;
    const gamepadDirectionEdge = gamepadDirectionActive && !this.previousGamepadDirection;
    this.previousGamepadDirection = gamepadDirectionActive;

    const leftX = blocked?.left ? 0 : (axes[0] ?? 0);
    const rightY = blocked?.right ? 0 : (axes[3] ?? 0);
    let initialsSlotDelta: -1 | 0 | 1 = 0;
    if (Math.abs(leftX) <= GAMEPAD_DEAD_ZONE) this.leftStickSlotArmed = true;
    else if (this.leftStickSlotArmed) {
      initialsSlotDelta = Math.sign(leftX) as -1 | 1;
      this.leftStickSlotArmed = false;
    }
    let initialsCharDelta: -1 | 0 | 1 = 0;
    if (Math.abs(rightY) <= GAMEPAD_DEAD_ZONE) this.rightStickCharArmed = true;
    else if (this.rightStickCharArmed) {
      initialsCharDelta = Math.sign(rightY) as -1 | 1;
      this.rightStickCharArmed = false;
    }

    return {
      gamepad,
      move,
      aim,
      startPressed: keysPressed.has("Enter") || keysPressed.has("NumpadEnter") || gamepadStartPressed,
      pausePressed: keysPressed.has("KeyP") || gamepadStartPressed,
      settingsPressed: keysPressed.has("KeyS") || gamepadBackPressed,
      screenAdvancePressed: gamepadDirectionEdge || [...keysPressed].some((code) => DIRECTION_CODES.has(code)),
      initialsSlotDelta,
      initialsCharDelta,
    };
  }

  private selectConnection(connectionId: string | undefined): void {
    if (this.selectedConnection === connectionId) return;
    this.selectedConnection = connectionId;
    this.previousGamepadDirection = false;
    this.leftStickSlotArmed = true;
    this.rightStickCharArmed = true;
  }

  private updateStickGates(gamepads: readonly Pick<GamepadSnapshot, "connectionId" | "axes">[]): void {
    const current = new Set(gamepads.map((gamepad) => gamepad.connectionId));
    for (const connectionId of this.blockedSticks.keys()) {
      if (!current.has(connectionId)) this.blockedSticks.delete(connectionId);
    }
    for (const gamepad of gamepads) {
      const blocked = this.blockedSticks.get(gamepad.connectionId);
      if (!blocked) continue;
      if (stickMagnitude(gamepad.axes, 0) <= GAMEPAD_DEAD_ZONE) blocked.left = false;
      if (stickMagnitude(gamepad.axes, 2) <= GAMEPAD_DEAD_ZONE) blocked.right = false;
      if (!blocked.left && !blocked.right) this.blockedSticks.delete(gamepad.connectionId);
    }
  }
}

const ZERO: Direction = { x: 0, y: 0 };

function directionFromKeys(keys: ReadonlySet<string>, right: string, left: string, down: string, up: string): Direction {
  return normalizeDirection({
    x: Number(keys.has(right)) - Number(keys.has(left)),
    y: Number(keys.has(down)) - Number(keys.has(up)),
  });
}

function applyDeadZone(x: number, y: number): Direction {
  const magnitude = Math.hypot(x, y);
  if (!Number.isFinite(magnitude) || magnitude <= GAMEPAD_DEAD_ZONE) return ZERO;
  const outputMagnitude = Math.min(1, (magnitude - GAMEPAD_DEAD_ZONE) / (1 - GAMEPAD_DEAD_ZONE));
  return { x: x / magnitude * outputMagnitude, y: y / magnitude * outputMagnitude };
}

function quantizeTouchDirection(dx: number, dy: number): Direction {
  const magnitude = Math.hypot(dx, dy);
  if (!Number.isFinite(magnitude) || magnitude <= TOUCH_NEUTRAL_ZONE) return ZERO;

  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const angle = sector * Math.PI / 4;
  const diagonal = Math.abs(sector % 2) === 1;
  const component = diagonal ? Math.SQRT1_2 : 1;
  return {
    x: Math.round(Math.cos(angle)) * (diagonal ? component : 1),
    y: Math.round(Math.sin(angle)) * (diagonal ? component : 1),
  };
}

function combineDirections(a: Direction, b: Direction): Direction {
  const direction = normalizeDirection({ x: a.x + b.x, y: a.y + b.y });
  if (direction.x === 0 && direction.y === 0) return ZERO;

  const angle = Math.atan2(direction.y, direction.x);
  const sector = Math.round(angle / (Math.PI / 4));
  const snappedAngle = sector * Math.PI / 4;
  const diagonal = Math.abs(sector % 2) === 1;
  const component = diagonal ? Math.SQRT1_2 : 1;
  return {
    x: Math.round(Math.cos(snappedAngle)) * (diagonal ? component : 1),
    y: Math.round(Math.sin(snappedAngle)) * (diagonal ? component : 1),
  };
}

function normalizeDirection(direction: Direction): Direction {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude <= 1) return direction;
  return { x: direction.x / magnitude, y: direction.y / magnitude };
}

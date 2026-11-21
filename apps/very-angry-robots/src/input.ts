/** A browser-independent snapshot of standard gamepad sticks, Start and Back/Select. */
export interface GamepadState {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  startPressed: boolean;
  backPressed?: boolean;
}

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
  /** One-shot keyboard events: uppercase A–Z or Backspace. */
  keyPresses: string[];
  /** True once when a gameplay direction is pressed or a stick leaves neutral. */
  screenAdvancePressed: boolean;
  /** One-step initials slot selection from the left stick's horizontal axis. */
  initialsSlotDelta: -1 | 0 | 1;
  /** One-step initials character cycling from the right stick's vertical axis. */
  initialsCharDelta: -1 | 0 | 1;
}

const MOVEMENT_KEYS = new Set(["w", "a", "s", "d"]);
const AIM_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const INPUT_KEYS = new Set([...MOVEMENT_KEYS, ...AIM_KEYS, "Enter", "Backspace"]);
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

/** Tracks controls without touching DOM or navigator APIs. */
export class InputController {
  private readonly keysDown = new Set<string>();
  private readonly blockedKeys = new Set<string>();
  private enterPressedEdge = false;
  private screenAdvanceKeyEdge = false;
  private readonly keyPressEdges: string[] = [];
  private previousGamepadStart = false;
  private previousGamepadBack = false;
  private previousGamepadDirection = false;
  private leftStickSlotArmed = true;
  private rightStickCharArmed = true;
  private pauseKeyEdge = false;
  private settingsKeyEdge = false;
  private blockedLeftStick = false;
  private blockedRightStick = false;
  private blockedStart = false;
  private blockedBack = false;

  /** Returns whether the key is used by this controller. */
  keyDown(rawKey: string, repeat = false): boolean {
    const key = normalizeKey(rawKey);
    if (!isInputKey(key)) return false;
    if (this.blockedKeys.has(key)) return true;

    const isLetter = /^[a-z]$/.test(key);
    const freshPress = !repeat && !this.keysDown.has(key);
    if (freshPress) {
      if (key === "Enter") this.enterPressedEdge = true;
      if (key === "p") this.pauseKeyEdge = true;
      if (key === "s") this.settingsKeyEdge = true;
      if (MOVEMENT_KEYS.has(key) || AIM_KEYS.has(key)) this.screenAdvanceKeyEdge = true;
      if (isLetter) this.keyPressEdges.push(key.toUpperCase());
      if (key === "Backspace") this.keyPressEdges.push("Backspace");
    }
    this.keysDown.add(key);
    return true;
  }

  keyUp(rawKey: string): void {
    const key = normalizeKey(rawKey);
    this.keysDown.delete(key);
    this.blockedKeys.delete(key);
  }

  /** Prevent a key used by a modal from leaking into gameplay until it is released. */
  blockKey(rawKey: string): void {
    const key = normalizeKey(rawKey);
    if (isInputKey(key)) this.blockedKeys.add(key);
  }

  /** Call on window blur or document visibility loss to release held keys. */
  clearKeyboard(): void {
    for (const key of this.keysDown) this.blockedKeys.add(key);
    this.keysDown.clear();
    this.enterPressedEdge = false;
    this.screenAdvanceKeyEdge = false;
    this.keyPressEdges.length = 0;
    this.pauseKeyEdge = false;
    this.settingsKeyEdge = false;
  }

  /** Ignore gamepad controls already held during a modal or pause transition until release. */
  suppressGamepadWhileHeld(gamepad?: GamepadState): void {
    if (!gamepad) return;
    this.blockedLeftStick ||= Math.hypot(gamepad.leftX, gamepad.leftY) > GAMEPAD_DEAD_ZONE;
    this.blockedRightStick ||= Math.hypot(gamepad.rightX, gamepad.rightY) > GAMEPAD_DEAD_ZONE;
    this.blockedStart ||= gamepad.startPressed;
    this.blockedBack ||= Boolean(gamepad.backPressed);
    if (gamepad.startPressed) this.previousGamepadStart = true;
    if (gamepad.backPressed) this.previousGamepadBack = true;
  }

  read(gamepad?: GamepadState): InputState {
    const moveKeys = directionFromKeys(this.keysDown, "d", "a", "s", "w");
    const aimKeys = directionFromKeys(this.keysDown, "ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp");
    const leftMagnitude = gamepad ? Math.hypot(gamepad.leftX, gamepad.leftY) : 0;
    const rightMagnitude = gamepad ? Math.hypot(gamepad.rightX, gamepad.rightY) : 0;
    if (leftMagnitude <= GAMEPAD_DEAD_ZONE) this.blockedLeftStick = false;
    if (rightMagnitude <= GAMEPAD_DEAD_ZONE) this.blockedRightStick = false;
    const effectiveLeft = gamepad && !this.blockedLeftStick ? applyDeadZone(gamepad.leftX, gamepad.leftY) : ZERO;
    const effectiveRight = gamepad && !this.blockedRightStick ? applyDeadZone(gamepad.rightX, gamepad.rightY) : ZERO;
    const move = combineDirections(moveKeys, effectiveLeft);
    const aim = combineDirections(aimKeys, effectiveRight);

    if (!gamepad?.startPressed) this.blockedStart = false;
    if (!gamepad?.backPressed) this.blockedBack = false;
    const gamepadStartPressed = Boolean(gamepad?.startPressed) && !this.blockedStart && !this.previousGamepadStart;
    this.previousGamepadStart = Boolean(gamepad?.startPressed);
    const startPressed = this.enterPressedEdge || gamepadStartPressed;
    this.enterPressedEdge = false;
    const gamepadBackPressed = Boolean(gamepad?.backPressed) && !this.blockedBack && !this.previousGamepadBack;
    this.previousGamepadBack = Boolean(gamepad?.backPressed);
    const pausePressed = this.pauseKeyEdge || gamepadStartPressed;
    const settingsPressed = this.settingsKeyEdge || gamepadBackPressed;
    this.pauseKeyEdge = false;
    this.settingsKeyEdge = false;

    const gamepadDirectionActive = (!this.blockedLeftStick && leftMagnitude > GAMEPAD_DEAD_ZONE)
      || (!this.blockedRightStick && rightMagnitude > GAMEPAD_DEAD_ZONE);
    const gamepadDirectionEdge = gamepadDirectionActive && !this.previousGamepadDirection;
    this.previousGamepadDirection = gamepadDirectionActive;

    const leftX = this.blockedLeftStick ? 0 : (gamepad?.leftX ?? 0);
    const rightY = this.blockedRightStick ? 0 : (gamepad?.rightY ?? 0);
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

    const keyPresses = this.keyPressEdges.splice(0);
    const screenAdvancePressed = this.screenAdvanceKeyEdge || gamepadDirectionEdge;
    this.screenAdvanceKeyEdge = false;
    return {
      move,
      aim,
      startPressed,
      pausePressed,
      settingsPressed,
      keyPresses,
      screenAdvancePressed,
      initialsSlotDelta,
      initialsCharDelta,
    };
  }
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function isInputKey(key: string): boolean {
  return INPUT_KEYS.has(key) || /^[a-z]$/.test(key);
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

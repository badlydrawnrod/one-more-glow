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

export interface InputState {
  move: Direction;
  aim: Direction;
  /** True for one read only when Enter or gamepad Start has just been pressed. */
  startPressed: boolean;
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

/** Tracks controls without touching DOM or navigator APIs. */
export class InputController {
  private readonly keysDown = new Set<string>();
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
  private pauseAction = false;
  private settingsAction = false;
  private blockedLeftStick = false;
  private blockedRightStick = false;
  private blockedStart = false;
  private blockedBack = false;

  /** Returns whether the key is used by this controller. */
  keyDown(rawKey: string, repeat = false): boolean {
    const key = normalizeKey(rawKey);
    const isLetter = /^[a-z]$/.test(key);
    if (!INPUT_KEYS.has(key) && !isLetter) return false;

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
    this.keysDown.delete(normalizeKey(rawKey));
  }

  /** Call on window blur or document visibility loss to release held keys. */
  clearKeyboard(): void {
    this.keysDown.clear();
    this.enterPressedEdge = false;
    this.screenAdvanceKeyEdge = false;
    this.keyPressEdges.length = 0;
    this.pauseKeyEdge = false;
    this.settingsKeyEdge = false;
    this.pauseAction = false;
    this.settingsAction = false;
  }

  /** Consume the latest one-shot pause/resume action. */
  takePauseAction(): boolean {
    const pressed = this.pauseAction;
    this.pauseAction = false;
    return pressed;
  }

  /** Consume the latest one-shot settings action. */
  takeSettingsAction(): boolean {
    const pressed = this.settingsAction;
    this.settingsAction = false;
    return pressed;
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
    this.pauseAction = this.pauseKeyEdge || gamepadStartPressed;
    this.settingsAction = this.settingsKeyEdge || gamepadBackPressed;
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
    return { move, aim, startPressed, keyPresses, screenAdvancePressed, initialsSlotDelta, initialsCharDelta };
  }
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
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

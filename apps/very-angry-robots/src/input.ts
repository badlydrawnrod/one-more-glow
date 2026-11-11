/** A browser-independent snapshot of the standard gamepad sticks and Start button. */
export interface GamepadState {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  startPressed: boolean;
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
}

const MOVEMENT_KEYS = new Set(["w", "a", "s", "d"]);
const AIM_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const INPUT_KEYS = new Set([...MOVEMENT_KEYS, ...AIM_KEYS, "Enter"]);
const GAMEPAD_DEAD_ZONE = 0.2;

/** Tracks controls without touching DOM or navigator APIs. */
export class InputController {
  private readonly keysDown = new Set<string>();
  private enterPressedEdge = false;
  private previousGamepadStart = false;

  /** Returns whether the key is used by this controller. */
  keyDown(rawKey: string, repeat = false): boolean {
    const key = normalizeKey(rawKey);
    if (!INPUT_KEYS.has(key)) return false;

    if (!repeat && !this.keysDown.has(key) && key === "Enter") {
      this.enterPressedEdge = true;
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
  }

  read(gamepad?: GamepadState): InputState {
    const moveKeys = directionFromKeys(this.keysDown, "d", "a", "s", "w");
    const aimKeys = directionFromKeys(this.keysDown, "ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp");
    const move = combineDirections(moveKeys, gamepad ? applyDeadZone(gamepad.leftX, gamepad.leftY) : ZERO);
    const aim = combineDirections(aimKeys, gamepad ? applyDeadZone(gamepad.rightX, gamepad.rightY) : ZERO);

    const gamepadStartPressed = Boolean(gamepad?.startPressed) && !this.previousGamepadStart;
    this.previousGamepadStart = Boolean(gamepad?.startPressed);
    const startPressed = this.enterPressedEdge || gamepadStartPressed;
    this.enterPressedEdge = false;

    return { move, aim, startPressed };
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

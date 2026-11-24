export interface GamepadSnapshot {
  connectionId: string;
  axes: readonly number[];
  buttons: readonly boolean[];
}

export interface KeyboardEntry {
  code: string | null;
  key: string;
}

export interface KeyboardFrame {
  down: readonly KeyboardEntry[];
  pressed: readonly KeyboardEntry[];
}

export interface GamepadFrame {
  connectionId: string;
  axes: readonly number[];
  buttonsDown: ReadonlySet<number>;
  buttonsPressed: ReadonlySet<number>;
}

export interface DeviceInputFrame {
  keyboard: KeyboardFrame;
  gamepads: readonly GamepadFrame[];
}

interface GamepadHistory {
  down: ReadonlySet<number>;
  blocked: ReadonlySet<number>;
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function keyIdentity(code: string | null, key: string): string {
  return code === null ? `key:${key}` : `code:${code}`;
}

function copyEntries(entries: Iterable<KeyboardEntry>): KeyboardEntry[] {
  return Array.from(entries, (entry) => ({ ...entry }));
}

export class InputDevices {
  private readonly keysDown = new Map<string, KeyboardEntry>();
  private readonly keysPressed = new Map<string, KeyboardEntry>();
  private readonly keysBlocked = new Set<string>();
  private readonly gamepadHistory = new Map<string, GamepadHistory>();

  keyDown(code: string | null, rawKey: string, repeat = false): void {
    if (repeat) return;
    const key = normalizeKey(rawKey);
    const identity = keyIdentity(code, key);
    if (this.keysBlocked.has(identity) || this.keysDown.has(identity)) return;

    const entry = { code, key };
    this.keysDown.set(identity, entry);
    if (!this.keysPressed.has(identity)) this.keysPressed.set(identity, entry);
  }

  keyUp(code: string | null, rawKey: string): void {
    const identity = keyIdentity(code, normalizeKey(rawKey));
    this.keysDown.delete(identity);
    this.keysBlocked.delete(identity);
  }

  blockKeyUntilReleased(code: string | null, rawKey: string): void {
    const identity = keyIdentity(code, normalizeKey(rawKey));
    this.keysDown.delete(identity);
    this.keysPressed.delete(identity);
    this.keysBlocked.add(identity);
  }

  suppressKeyboardUntilReleased(): void {
    for (const identity of this.keysDown.keys()) this.keysBlocked.add(identity);
    this.keysDown.clear();
    this.keysPressed.clear();
  }

  clearKeyboard(): void {
    this.keysDown.clear();
    this.keysPressed.clear();
    this.keysBlocked.clear();
  }

  suppressGamepadButtonsWhileHeld(snapshot: GamepadSnapshot): void {
    const blocked = new Set<number>();
    snapshot.buttons.forEach((pressed, index) => {
      if (pressed) blocked.add(index);
    });
    this.gamepadHistory.set(snapshot.connectionId, { down: new Set(), blocked });
  }

  read(gamepads: readonly GamepadSnapshot[]): DeviceInputFrame {
    const connectionIds = new Set<string>();
    for (const { connectionId } of gamepads) {
      if (connectionIds.has(connectionId)) {
        throw new Error(`Duplicate gamepad connection ID: ${connectionId}`);
      }
      connectionIds.add(connectionId);
    }

    for (const connectionId of this.gamepadHistory.keys()) {
      if (!connectionIds.has(connectionId)) this.gamepadHistory.delete(connectionId);
    }

    const keyboard = {
      down: copyEntries(this.keysDown.values()),
      pressed: copyEntries(this.keysPressed.values()),
    };
    this.keysPressed.clear();

    return { keyboard, gamepads: gamepads.map((snapshot) => this.readGamepad(snapshot)) };
  }

  private readGamepad(snapshot: GamepadSnapshot): GamepadFrame {
    const { connectionId, axes, buttons } = snapshot;
    const previous = this.gamepadHistory.get(connectionId);
    const down = new Set<number>();
    const pressed = new Set<number>();
    const blocked = new Set<number>();
    buttons.forEach((isDown, index) => {
      if (!isDown) return;
      if (!previous || previous.blocked.has(index)) {
        blocked.add(index);
        return;
      }

      down.add(index);
      if (!previous.down.has(index)) pressed.add(index);
    });

    this.gamepadHistory.set(connectionId, { down, blocked });
    return { connectionId, axes: [...axes], buttonsDown: new Set(down), buttonsPressed: pressed };
  }
}

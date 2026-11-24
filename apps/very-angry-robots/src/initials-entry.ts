export interface InitialsEntry {
  characters: [string, string, string];
  selectedSlot: number;
}

export interface InitialsEntryInput {
  keyPresses: readonly string[];
  slotDelta: -1 | 0 | 1;
  charDelta: -1 | 0 | 1;
}

const CHARACTER_CYCLE = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export function createInitialsEntry(): InitialsEntry {
  return { characters: ["", "", ""], selectedSlot: 0 };
}

export function updateInitialsEntry(entry: InitialsEntry, input: InitialsEntryInput): InitialsEntry {
  const characters = [...entry.characters] as [string, string, string];
  let selectedSlot = Math.max(0, Math.min(2, entry.selectedSlot + input.slotDelta));

  for (const key of input.keyPresses) {
    if (key === "Backspace") {
      const lastEntered = characters.findLastIndex((value) => value !== "");
      if (lastEntered >= 0) {
        characters[lastEntered] = "";
        selectedSlot = lastEntered;
      }
    } else if (/^[A-Z]$/.test(key)) {
      const nextEmpty = characters.indexOf("");
      if (nextEmpty >= 0) {
        characters[nextEmpty] = key;
        selectedSlot = Math.min(nextEmpty + 1, 2);
      }
    }
  }

  if (input.charDelta !== 0) {
    const index = CHARACTER_CYCLE.indexOf(characters[selectedSlot]);
    // Up advances from blank through A–Z; down reverses and wraps.
    const step = input.charDelta > 0 ? -1 : 1;
    characters[selectedSlot] = CHARACTER_CYCLE[(index + step + CHARACTER_CYCLE.length) % CHARACTER_CYCLE.length];
  }

  return { characters, selectedSlot };
}

/** Applies delivered edits immediately and ends the session at the first submission. */
export class InitialsEditor {
  private current = createInitialsEntry();
  private readonly typingKeys = new Set<string>();
  private submitted = false;

  get entry(): InitialsEntry {
    return this.current;
  }

  keyDown(code: string, key: string, repeat: boolean): boolean {
    if (this.submitted) return false;
    if (key === "Enter") return !repeat && this.submit();
    if (key !== "Backspace" && !/^[a-z]$/i.test(key)) return false;

    const identity = this.keyIdentity(code, key);
    if (repeat && !this.typingKeys.has(identity)) return false;
    this.typingKeys.add(identity);
    const edit = key === "Backspace" ? key : key.toUpperCase();
    this.current = updateInitialsEntry(this.current, { keyPresses: [edit], slotDelta: 0, charDelta: 0 });
    return false;
  }

  keyUp(code: string, key: string): void {
    this.typingKeys.delete(this.keyIdentity(code, key));
  }

  clearTypingKeys(): void {
    this.typingKeys.clear();
  }

  touchSlot(slot: number): void {
    if (this.submitted) return;
    this.current = updateInitialsEntry({ ...this.current, selectedSlot: slot }, {
      keyPresses: [], slotDelta: 0, charDelta: 1,
    });
  }

  touchBackspace(): void {
    if (this.submitted) return;
    this.current = updateInitialsEntry(this.current, { keyPresses: ["Backspace"], slotDelta: 0, charDelta: 0 });
  }

  poll(slotDelta: -1 | 0 | 1, charDelta: -1 | 0 | 1, startPressed: boolean): boolean {
    if (this.submitted) return false;
    this.current = updateInitialsEntry(this.current, { keyPresses: [], slotDelta, charDelta });
    return startPressed && this.submit();
  }

  submit(): boolean {
    if (this.submitted) return false;
    this.submitted = true;
    return true;
  }

  private keyIdentity(code: string, key: string): string {
    return code && code !== "Unidentified" ? code : key.toLowerCase();
  }
}

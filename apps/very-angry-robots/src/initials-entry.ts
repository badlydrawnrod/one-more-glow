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

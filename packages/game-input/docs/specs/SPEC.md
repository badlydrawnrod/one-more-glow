# Game Input — Specification

## Scope and status

**Status: Accepted. Implementation: Device state implemented.** The accepted scope
includes the public device-frame contract, physical gameplay bindings
in both consumers, and app-owned typing, axis policy, and touch controls.

The workspace package `@one-more-glow/game-input` turns keyboard events and caller-supplied snapshots of zero or more
gamepads into device-level state that a game can read once per frame. Each app
remains responsible for mapping that state to its controls, screens and actions.

## Purpose

Asteroids and Very Angry Robots share keyboard state tracking, one-shot press
detection and held-input suppression across focus and screen transitions.
Each game owns its control mappings and decides when to apply suppression.

The package is an independent workspace library. It has no dependency on an app
or on `one-more-glow`, and consumers import it through its public package entry
point. Its source and tests do not access browser globals; apps adapt DOM and
Gamepad API events into the package's input values.

## Capability

### Device frame

Expose a browser-independent frame containing the currently held gameplay keys,
fresh gameplay key presses, and, for each gamepad connection, its current axes
and buttons plus fresh button press edges. A fresh edge occurs on a transition
from released to pressed. A held key or button appears in held state on each
frame unless suppressed; its press edge appears in only one frame.

The package reports device state. It does not produce game actions such as
`turn`, `thrust`, `move`, `fire`, `pause`, `start`, or `hyperspace`, and it does
not depend on a game's screen type. Each consumer maps device state to its own
action frame and decides when actions are valid.

Public types follow.

```ts
export interface GamepadSnapshot {
  connectionId: string;
  axes: readonly number[];
  buttons: readonly boolean[];
}

export interface KeyboardFrame {
  down: readonly KeyboardEntry[];
  pressed: readonly KeyboardEntry[];
}

export interface KeyboardEntry {
  code: string | null;
  key: string;
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
```

The package exports the following state owner.

```ts
export class InputDevices {
  keyDown(code: string | null, rawKey: string, repeat?: boolean): void;
  keyUp(code: string | null, rawKey: string): void;
  blockKeyUntilReleased(code: string | null, rawKey: string): void;
  suppressKeyboardUntilReleased(): void;
  clearKeyboard(): void;
  suppressGamepadButtonsWhileHeld(snapshot: GamepadSnapshot): void;
  read(gamepads: readonly GamepadSnapshot[]): DeviceInputFrame;
}
```

**Accepted decision — state owner:** The developer chose one `InputDevices`
owner for keyboard and gamepad state. Keyboard and gamepad lifecycle operations
must remain independent, including operations affecting one gamepad connection.

### Keyboard controls and typing

Keyboard controls express game actions: they need held state and discrete
presses, and ignore operating-system key repeat for press edges. Typing expresses
text and editing intent: it may require ordered input, repeated characters or
deletion, composition, and keyboard layout support. Do not infer text from a
gameplay frame or apply gameplay repeat and normalization rules to typing.

**Accepted decision — typing:** Each app owns text entry and its browser
integration, including how it captures text and editing commands. A future shared
capability would need its own contract and a concrete consumer need. An app decides which input mode is active and
routes input accordingly; text-entry keys must not trigger unrelated gameplay
actions. The app handles focus and transitions between modes and suppresses
controls as needed so a held key does not leak into the next screen.

### Keyboard control tracking

- **Accepted decision — keyboard identity:** Use both the physical key `code`
  and the `key` value observed on key-down. Track a held key by its `code` so
  key-up can release it even if its `key` value changes. Games will typically
  map controls using `code`; the observed `key` value remains available for
  value-based mappings. **Accepted decision — simultaneous keys:** Expose each
  code with its own key-down value, even when multiple codes share that value;
  releasing one does not release another. **Accepted decision — frame entries:**
  Held and freshly pressed keys are exposed as separate collections of entries,
  each containing a `code` and its key-down `key` value.
- **Accepted decision — unavailable code:** Do not invent a physical code when
  an event has a missing or unusable code. Make its reported key value available
  so the app can choose a value-based fallback. Such a fallback cannot reliably
  distinguish inputs with the same value or match a release if its value changes;
  it does not activate a code-based binding automatically. The adapter supplies
  `null` for an unavailable code; the package tracks such input by normalized key
  value as a best effort. If a changed value prevents matching key-up, an explicit
  keyboard clear removes the remaining held state.
- Accept key-down and key-up values from the app's browser event handlers.
- Normalize single-character keys to lowercase. Preserve named key strings such
  as `ArrowLeft`, `Enter` and `Backspace`.
- Ignore repeating key-down events entirely, including orphan repeats after
  focus recovery.
- The pressed collection reports whether each key had at least one fresh press
  since the last read. Multiple presses of the same key between reads coalesce
  into one entry. The frame carries no ordered action queue.
- **Accepted decision — coalescing identity and value:** Coalesce presses by
  `code`, or by normalized `key` when `code` is unavailable. Different codes
  remain separate even when their key values match. If the same identity is
  pressed more than once before a read, retain the normalized key-down value
  from the first press (for example, `1` rather than `!` if those values occur
  in that order for the same code).
- Return a fresh snapshot from `read()`; reading consumes pending press edges,
  but held keys remain held until key-up or an explicit clear.
- **Accepted decision — focus recovery:** The developer chose to allow a fresh
  key press after focus returns even if the prior key-up was missed. On focus
  loss, clear held keys, pending edges and focus-related suppression; the next
  observed fresh key-down can register without a preceding key-up. Auto-repeat
  does not create a fresh edge. The browser cannot reliably tell whether a key
  remained physically held while unfocused, so a held key can generate input
  after focus returns. The app still decides when input is active and whether
  the game is paused. Suppression explicitly used for modal or screen
  transitions remains a separate concern.
- `blockKeyUntilReleased()` immediately removes the matching held entry and
  pending edge, including a pending edge left by a completed tap. Further
  presses of that identity stay blocked until key-up.
- `suppressKeyboardUntilReleased()` discards all pending edges and blocks every
  currently held identity. Previously blocked identities stay blocked until
  key-up. An app can also block an individual key it consumed at the transition.
- `clearKeyboard()` clears held entries, pending edges, and blocked identities
  on focus loss. The active modal owns keyboard routing, including
  `preventDefault` and event propagation policy.
- Return unrecognized keys in the device frame rather than imposing a game-wide
  key allowlist. Each app chooses which keys to map or prevent in the browser.

### Gamepad tracking

The web [Gamepad API](https://www.w3.org/TR/gamepad/) can expose multiple
controllers. Its indices identify currently connected devices and may be reused;
they are not persistent player identities. Browser availability can depend on
user interaction, focus, and permissions. The adapter owns these concerns.

**Accepted decision — shared button tracking:** The package owns gamepad button
held state, press edges and suppression until release. Apps choose button
mappings and when to request suppression. Axis gating remains app-owned.

- **Accepted decision — multiple gamepads:** The developer chose to support
  multiple independently tracked controllers in the first version while apps
  choose which controllers to use. Accept a complete collection of
  browser-independent snapshots on each read,
  including an empty collection when no controller is available. The app discovers
  devices, adapts browser values and chooses which connections to include. The
  package neither calls `navigator.getGamepads()` nor assigns controllers to players.
- Identify each connection with a caller-supplied token unique among the included
  connections and different for every new connection, even if the browser reuses
  an index. Keep button history and suppression independent for each token. The
  browser adapter must observe disconnection and generate a new token on
  reconnection, including when both occur between reads. **Accepted decision —
  uncertain continuity:** When the adapter cannot establish continuity, it
  discards the old token and supplies a new one. The first-observation policy
  then applies. A reusable browser index alone cannot establish continuity.
- **Accepted decision — duplicate tokens:** If a read contains duplicate
  connection tokens, throw an error. Validate the collection before changing
  any tracking state, including pending keyboard edges.
- Preserve axis values and report held buttons and fresh button edges by index.
  **Accepted decision — first observation:** The developer chose to suppress
  buttons already held when a connection is first observed. They produce no
  held state or press edge until release, followed by a fresh press. A browser
  that reveals a controller in response to a press may therefore require a
  second press.
- Omission of a previously supplied connection removes its state and suppression
  history without affecting other connections. A new token has new history.
- `suppressGamepadButtonsWhileHeld()` samples one connection at a transition.
  Every currently down button is blocked until observed up. The sample
  recognizes releases and generates no edges. Buttons absent from the sample
  count as up. Other connections, keyboard state, and previously returned frames
  are unaffected. An app can apply the operation to each affected connection,
  including when a keyboard or pointer action triggers a transition between
  frames.
- Report axes as supplied in the snapshot. Do not assign action meanings, apply
  dead zones, or suppress axes through a universal rule. Axis grouping,
  thresholds and transition policy differ by game and remain in the app. A
  shared dead-zone helper may be considered if both consumers need the same
  well-defined scalar or radial behavior; no universal threshold is proposed.

  **Accepted decision — dead-zone helpers:** Keep dead-zone calculations in the
  apps for now. Consider shared helpers during integration when consumers need
  the same defined calculation. Candidates include scalar and radial dead zones
  and digital threshold checks. App-defined profiles may combine parameters;
  package-provided profiles and defaults are deferred. Any shared helper needs
  explicit boundary, scaling and invalid-value behavior.

### Read and state lifecycle

- Apps may call key event methods at event time and `read()` once per frame.
- Edge state is consumed by `read()`, including when the app chooses not to act
  on that frame. Apps should read exactly once per input frame and reuse the
  returned frame for all game decisions that frame.
- Gameplay key presses are retained until the next read; gamepad edges are
  inferred only from successive supplied snapshots. A gamepad press and release
  entirely between polls cannot be observed by the package.
- The package exposes no mutable internal collections. Supplied snapshots and
  returned frames share no mutable tracking state with the package.
- Route each frame to a single screen so the triggering edge cannot also act
  on the next screen.
- The package does not decide when focus is lost, a modal opens, or a screen
  changes. The app calls the relevant clear or suppression operation at those
  boundaries.

## Ownership boundaries

The package owns:

- key-name normalization, held-key tracking and one-frame press edges;
- gamepad snapshot edge tracking and held-input suppression;
- button suppression until release for gamepads;
- small device-level helpers only when their behavior is shared and explicit.

Each app owns:

- browser event registration, focus and visibility policy, gamepad discovery,
  selection and browser API adaptation;
- key and gamepad index mappings, dead-zone values and input combination rules;
- gamepad axis gating and suppression policy, including stick grouping and
  neutral thresholds;
- conversion from device frames to game actions and screen-specific behavior;
- text entry, editing, composition, and routing between typing and game controls;
- settings or modal navigation policy and all game-specific touch behavior.

**Accepted decision — touch scope:** The developer chose to leave touch out of
the first version of `@one-more-glow/game-input`. Very Angry Robots retains its
own touch controls and combines their output with keyboard and gamepad input in the app.
The accepted [touch-controls specification](../../../../apps/very-angry-robots/docs/specs/touch-controls.md)
remains authoritative for the app's behavior.

When adopting the package, Very Angry Robots must continue to:

- Own the touch UI, pointer events and capture, independent move and aim sticks,
  and touch actions for screens, settings and initials entry.
- Read its touch state alongside the package's keyboard and gamepad frame and
  apply its existing input combination rules, including touch aim, firing and
  player facing. The package does not choose which input takes precedence.
- Release the affected input on pointer release, cancellation or loss of
  capture, and clear active touch input on focus loss and screen transitions, as
  required by the app spec. Stale touches must not restart movement or firing.
- Preserve touch-only operation and the app spec's existing verification
  scenarios, including simultaneous sticks and interrupted gestures.

A shared touch capability would require a separate proposal and a concrete
consumer need; it is not part of the first version.

## Compatibility and consumers

Diagnostics, Asteroids, Gyruss and Very Angry Robots consume the package.
Diagnostics uses device state for Escape handling and standard-mapped gamepad
navigation; native keyboard focus and controls remain browser-managed. Asteroids
and Very Angry Robots map gameplay controls by physical `code` to preserve US
and UK QWERTY control positions across layouts. Very Angry Robots uses the typed
letter for initials and processes ordered editing in the app. Gyruss preserves
its existing normalized `event.key` value mappings (`a`/`d`, arrows, Space,
ArrowUp, and `z`) rather than switching to physical-key bindings. Each app owns
its mappings, thresholds, action names, and controller selection. Gyruss uses
the first connected controller in browser enumeration order for gameplay; other
controllers do not contribute gameplay input. See the
[diagnostics workbench specification](../../../../apps/diagnostics/docs/specs/diagnostics-workbench.md),
[Asteroids specification](../../../../apps/asteroids-demo/docs/specs/SPEC.md),
[Gyruss specification](../../../../apps/gyruss-demo/docs/specs/SPEC.md),
and the [Very Angry Robots specification](../../../../apps/very-angry-robots/docs/specs/SPEC.md)
for their input behavior.

## Public package boundary

- The package has one supported public entry point. Internal implementation
  modules are not importable by consumers.
- The package has no runtime dependency on `one-more-glow`, apps, or browser
  frameworks.
- Public values use standard TypeScript and JavaScript types. Browser `KeyboardEvent`,
  `Gamepad`, DOM nodes and app types do not cross the package boundary.
- The package is covered by its own deterministic tests. Consumer integration
  tests verify that each app's adapter preserves the mappings and transition
  behavior described above.

## Verification scenarios

- A fresh key-down produces one press edge; repeated key-down does not; held
  state persists until key-up. A press and release between reads still reports
  the pending press edge once even though the key is no longer down.
- Key normalization treats `A` and `a` consistently while preserving named
  browser key values.
- Two fresh presses of the same gameplay key before a read produce one pressed
  entry, which is absent from the next read unless pressed again.
- Two presses of one code with different key-down values retain the first
  normalized value; different codes with the same value produce separate entries.
  Code-less presses coalesce by normalized key value.
- In Very Angry Robots initials entry, enter `A`, `A`, then Backspace before the
  next game update: the app processes them in order, preserves the accepted
  initials behavior, and does not trigger gameplay actions. Check transitions
  into and out of typing while keys are held.
- A fresh gamepad button press produces one edge; a held button remains down
  without repeating its edge; release and repress produces a new edge. A button
  press and release entirely between gamepad polls cannot be observed.
- Gamepad axes are passed through unchanged, while suppressed buttons remain
  inactive until release.
- On focus loss, clear held keys and pending edges; after return, a fresh
  key-down registers even when the earlier key-up was missed. Repeated key-down
  events do not generate a fresh edge. Check the app stays paused until its
  explicit resume action where required.
- Blocking a key or suppressing gamepad inputs held at a transition prevents
  them from leaking into the next screen, while fresh input after release works.
- Two gamepads can hold and press the same button independently; suppressing or
  disconnecting one leaves the other's state and edges intact.
- A button held on first observation is suppressed until released and freshly
  pressed. Verify this in all consumers. A new connection token prevents history from leaking when the browser reuses
  an index, including a disconnect and reconnect between reads.
- An empty collection removes all gamepad state; reordering snapshots does not
  exchange their histories. Duplicate connection tokens cause an error without
  changing tracking state.
- Multiple reads in a frame do not duplicate a press edge; the documented
  consume-on-read behavior is covered explicitly.
- Asteroids integration preserves turn, thrust, fire, hyperspace, start, pause
  and title behavior, including modal suppression.
- Diagnostics integration routes Escape key edges and standard-mapped
  controller button state through the package while preserving native keyboard
  focus, diagnostics-owned UI actions and axis policy.
- Very Angry Robots integration preserves movement and aim independently,
  pause/settings edges, initials-entry input and screen-transition suppression.
- Very Angry Robots integration retains independent simultaneous touch sticks,
  touch-only screen actions and the input combination rules. Verify release,
  cancellation, loss of capture, focus loss and screen transitions against the
  app's touch scenarios, including that stale touches do not resume actions.
- Gyruss integration preserves normalized `event.key` mappings for A/D,
  Left/Right, Space, ArrowUp and Z, keyboard-plus-controller turn combination,
  and gameplay from only the first connected controller in enumeration order.
  Verify browser snapshots preserve that order and app-owned axis/D-pad policy;
  a button held on first observation stays suppressed until release and a fresh
  press; and R produces one fresh restart edge only while game over, with
  auto-repeat ignored.

## Implementation status

The package implements keyboard and gamepad tracking, consume-on-read frames,
and transition suppression. Deterministic tests cover the package contract.
See the owning app specifications for integration behavior and verification.
Shared dead-zone helpers and shared touch controls remain outside this capability.

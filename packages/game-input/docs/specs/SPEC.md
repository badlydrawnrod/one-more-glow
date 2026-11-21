# Game Input — Specification

## Scope and status

**Status: Proposed. Implementation: Not started.** This proposal describes a
small workspace package for input-device state shared by the Asteroids and Very
Angry Robots apps. **Accepted decision:** The developer chose the package name
`@one-more-glow/game-input`, retaining `one-more-glow` for the graphics package.
The input API remains open for review. This document records candidate
requirements and the explicitly accepted decisions identified below. It does not authorize
implementation of proposed behavior before the developer accepts it.

The package turns keyboard events and caller-supplied snapshots of zero or more
gamepads into device-level state that a game can read once per frame. Each app
remains responsible for mapping that state to its controls, screens and actions.

## Purpose

Asteroids and Very Angry Robots each maintain keyboard state, one-shot key
presses, gamepad button edges and held-input suppression across focus or screen
transitions. Keep these shared device mechanics in one tested package while
preserving each app's own control mapping and screen policy.

The package is an independent workspace library. It has no dependency on an app
or on `one-more-glow`, and consumers import it through its public package entry
point. Its source and tests do not access browser globals; apps adapt DOM and
Gamepad API events into the package's input values.

## Proposed capability

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

Candidate public types:

```ts
export interface GamepadSnapshot {
  connectionId: string;
  axes: readonly number[];
  buttons: readonly boolean[];
}

export interface KeyboardFrame {
  down: ReadonlySet<string>;
  pressed: ReadonlySet<string>;
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

The types are illustrative pending API review. The public contract is their
semantics, not the requirement to use these exact names or class layout.

One candidate owner API is:

```ts
class InputDevices {
  keyDown(rawKey: string, repeat?: boolean): void;
  keyUp(rawKey: string): void;
  blockKeyUntilReleased(rawKey: string): void;
  clearKeyboard(): void;
  suppressGamepadButtonsWhileHeld(snapshot: GamepadSnapshot): void;
  read(gamepads: readonly GamepadSnapshot[]): DeviceInputFrame;
}
```

This sketch is for discussion. In particular, reviewers should check whether
one owner object and explicit suppression methods make lifecycle and
consume-on-read behavior clear enough for both consumers.

### Keyboard controls and typing

Keyboard controls express game actions: they need held state and discrete
presses, and ignore operating-system key repeat for press edges. Typing expresses
text and editing intent: it may require ordered input, repeated characters or
deletion, composition, and keyboard layout support. Do not infer text from a
gameplay frame or apply gameplay repeat and normalization rules to typing.

This proposal leaves text entry with the app and its browser integration. It
does not yet propose a shared text API or decide how the browser adapter captures
text and editing commands. A future shared capability would need its own contract
and a concrete consumer need. An app decides which input mode is active and
routes input accordingly; text-entry keys must not trigger unrelated gameplay
actions. The app handles focus and transitions between modes and suppresses
controls as needed so a held key does not leak into the next screen.

### Keyboard control tracking

- Accept key-down and key-up values from the app's browser event handlers.
- Normalize single-character keys to lowercase. Preserve named key strings such
  as `ArrowLeft`, `Enter` and `Backspace`.
- Ignore auto-repeat for press-edge generation. Repeating key-down events must
  not create additional edges.
- A pressed-key set reports whether a key had at least one fresh press since
  the last read. Multiple presses of the same key between reads are coalesced;
  order and multiplicity are not retained in the gameplay frame. **Accepted
  decision:** The developer chose this behavior to match the current games'
  discrete actions. This acceptance covers the coalescing behavior only.
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
- Allow an app to block a specific key until its key-up, for example when a
  modal consumes it. Blocking affects the package's reported state and edges;
  the app still owns `preventDefault` and event propagation policy.
- Return unrecognized keys in the device frame rather than imposing a game-wide
  key allowlist. Each app chooses which keys to map or prevent in the browser.

### Gamepad tracking

The web [Gamepad API](https://www.w3.org/TR/gamepad/) can expose multiple
controllers. Its indices identify currently connected devices and may be reused;
they are not persistent player identities. Browser availability can depend on
user interaction, focus, and permissions. The adapter owns these concerns.

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
  reconnection, including when both occur between reads. If that cannot be
  observed, the adapter must reset the affected connection rather than claim
  continuity. Duplicate tokens are invalid; the API's error handling remains open.
- Preserve axis values and report held buttons and fresh button edges by index.
  **Accepted decision — first observation:** The developer chose to suppress
  buttons already held when a connection is first observed. They produce no
  held state or press edge until release, followed by a fresh press. A browser
  that reveals a controller in response to a press may therefore require a
  second press.
- Omission of a previously supplied connection removes its state and suppression
  history without affecting other connections. A new token has new history.
- Allow the caller to suppress buttons held on a specified connection at a
  transition; other connections are unaffected. Suppressed buttons become
  available after release and a fresh press. The app may apply this operation to
  each connection when a transition affects all players.
- Report axes as supplied in the snapshot. Do not assign action meanings, apply
  dead zones, or suppress axes through a universal rule. Axis grouping,
  thresholds and transition policy differ by game and remain in the app. A
  shared dead-zone helper may be considered if both consumers need the same
  well-defined scalar or radial behavior; no universal threshold is proposed.

### Read and state lifecycle

- Apps may call key event methods at event time and `read()` once per frame.
- Edge state is consumed by `read()`, including when the app chooses not to act
  on that frame. Apps should read exactly once per input frame and reuse the
  returned frame for all game decisions that frame.
- Gameplay key presses are retained until the next read; gamepad edges are
  inferred only from successive supplied snapshots. A gamepad press and release
  entirely between polls cannot be observed by the package.
- Clearing or suppressing input discards pending edges so transitions cannot
  replay an action on the next screen.
- The package exposes no mutable internal collections. Returned frames are
  snapshots and may be retained by the caller without changing later package
  state.
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

The first integrations considered are:

- **Asteroids:** map the shared frame to its turn, thrust, fire, hyperspace,
  start, pause and title actions. Preserve its existing keyboard/gamepad
  mappings, simultaneous keyboard and gamepad support, and screen-specific
  Start and Back behavior.
- **Very Angry Robots:** map the shared frame to movement, aim, start, pause,
  settings and initials-entry actions. Preserve independent movement and aim,
  one-step initials stick flicks, and its current key and standard-gamepad
  mappings.

Each migration must preserve its app's observable control behavior, subject to
the explicitly chosen first-observation and focus-recovery policies. The package
must not force both games to use the same control mapping, thresholds, or action
names. Very Angry Robots must retain its accepted initials-entry behavior,
including ordered letters and Backspace, through an app-owned typing path rather
than a gameplay press set. Both apps currently treat an observed gamepad button
as a fresh edge when there is no previous pressed state; the accepted
first-observation policy deliberately differs. Check the owning app specs and
record any separately approved changes to their accepted requirements before
migration. Gyruss is not
an initial migration target; consider it only if it has a concrete need for this
device-state contract.

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
  pressed. Verify the difference from both apps' current first-press behavior.
  A new connection token prevents history from leaking when the browser reuses
  an index, including a disconnect and reconnect between reads.
- An empty collection removes all gamepad state; reordering snapshots does not
  exchange their histories. Duplicate connection tokens follow the selected error
  policy once that policy is decided.
- Multiple reads in a frame do not duplicate a press edge; the documented
  consume-on-read behavior is covered explicitly.
- Asteroids integration preserves turn, thrust, fire, hyperspace, start, pause
  and title behavior, including modal suppression.
- Very Angry Robots integration preserves movement and aim independently,
  pause/settings edges, initials-entry input and screen-transition suppression.
- Very Angry Robots integration retains independent simultaneous touch sticks,
  touch-only screen actions and the input combination rules. Verify release,
  cancellation, loss of capture, focus loss and screen transitions against the
  app's touch scenarios, including that stale touches do not resume actions.

## Open review questions

- Is one `InputDevices` owner sufficient, or should keyboard and gamepad state
  be separate trackers so a consumer can reset either independently?
- How should duplicate connection tokens be reported? How does the adapter
  identify a new connection if a disconnect event is not observed, including
  when visibility or focus changes? It cannot reliably distinguish an unseen
  replacement using the browser's reusable index alone.
- Does tracking by `KeyboardEvent.key` handle changes in modifiers or keyboard
  layout between key-down and key-up? If not, should the adapter identify the
  physical key separately using `code`? Consider simultaneous physical keys
  with the same key value and values that change while held.
- How should Very Angry Robots capture ordered initials and editing input while
  preserving its accepted behavior? Should typing eventually be a separate shared
  capability if another app needs it, and what would justify that scope?
- Which dead-zone helpers, if any, have identical semantics needed by both
  initial consumers?
- Are shared gamepad button-edge tracking and button suppression useful enough
  if axis gating remains app-owned?
- Which app-specific integration tests belong in each app versus package-level
  contract tests?

## Implementation status

Not implemented. Except for the explicitly accepted decisions on gameplay press
coalescing, focus recovery, multiple controllers, first observation, package
name and excluding touch from the first version, the package API, app migration
and build configuration remain proposed; no verification result is claimed.

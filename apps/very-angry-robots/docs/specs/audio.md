# Audio

## Scope and status

**Status: Accepted. Implementation: Complete.** Gameplay and interface audio
are implemented in the browser game, using the original Very Angry Robots
audio assets where practical. The original repository contains OGG files under
`android/assets/data/sounds/`; it also includes `android/CC-LICENSE` and credits Rod Hyde.
Retain the applicable attribution and license notice when reusing those files.
The original source code is available in the
[libGDX demo](https://github.com/libgdx/libgdx-demo-very-angry-robots).

This capability covers gameplay and interface sound effects, plus the original
recorded Captain speech and robot/family taunts. The original game has no
background music requirement. Achievement sounds remain deferred with the
achievement capability because achievements themselves are deferred.

## Playback and controls

- Play sounds in response to resolved game or interface events. Audio is
  presentation only; it must not change gameplay timing, scoring, input or
  outcomes.
- Use browser-native audio playback in the app. Keep audio assets and playback
  out of the shared drawing package; no `DrawingContext` or renderer changes
  are needed.
- Add a sound enable control and master volume control to the existing Settings
  screen. Sound is enabled by default at full volume. Apply changes immediately
  and persist them across screens and browser reloads separately from the
  renderer display profile. If browser storage or audio playback is unavailable,
  continue the session without sound errors affecting play.
- Browser audio restrictions must not prevent the game from starting. Begin
  playback after the first user interaction when the browser requires a user
  gesture.
- Pause gameplay sounds when gameplay is paused or the browser loses focus. Do
  not replay stale one-shot effects on resume. Sounds must not play during
  attract-screen animation unless caused by a deliberate interface action.
- Prevent simultaneous events and sustained firing from creating an
  overwhelming or continuously distorted mix. Coalesce redundant same-frame
  events where appropriate and keep effects short.

## Event cues

Use the original OGG assets when their quality, format and license permit. The
following mappings are starting points based on the original asset names and
game events; tune playback level and retrigger behavior for this port.

| Event | Original asset candidate |
| --- | --- |
| Player shot fired | `hit02.ogg` |
| Robot shot fired | `hit02.ogg` |
| Robot destroyed | `hit01.ogg` |
| Room cleared | `hit03.ogg` |
| Player defeated | `hit02.ogg` |
| Player touches an electrified wall | `buzz05.ogg` |
| Robot touches an electrified wall | `buzz01.ogg` |
| Player enters a room or respawns | `electrifying01.ogg` |
| Extra life awarded | `pickup.ogg` |
| Menu or settings action | `bleep.ogg` |

Treat these mappings as event guidance, not a requirement to play the same
sample for every repeated shot. Trigger sounds from the gameplay event that
caused them, so simultaneous contacts do not duplicate an effect and effects
remain correct when events occur during the death interval.

## Recorded voices and taunts

- Play `captain_enter_room_speech.ogg` when the Captain becomes visible and
  enters a room. Do not start another spoken clip over it.
- After the player spawns, allow robot taunts during active play. Choose a
  random clip from `standard_taunts/` at irregular intervals, using the
  original's 2.5 to 15 second interval as a starting point. Stop scheduling
  taunts when the player is defeated, paused, or leaves the active game screen.
- When the player leaves a room while robots remain, play
  `exit_room_as_chicken_speech.ogg`. Use clips from `chicken_taunts/` for later
  taunts in that run, reflecting the original game's reaction to retreating
  from robots. Reset to standard taunts when a fresh run starts.
- Do not overlap spoken clips. When a line is playing, defer the next taunt
  until the line finishes and then schedule the next interval. Spoken playback
  must not delay or otherwise affect gameplay.
- Do not play taunts or Captain speech on Main Menu, Top Scores, initials entry,
  settings, or game-over screens. A deliberate interface action may play its
  short interface effect while on those screens.

## Verification scenarios

- Confirm each supported gameplay event plays its intended sound once, and
  that missed shots or shots leaving the room do not trigger impact sounds.
- Confirm player and robot fire sounds remain clear during sustained and
  simultaneous firing.
- Confirm pause, focus loss, resume and settings changes behave as specified;
  audio failures do not interrupt play.
- Confirm the sound enable and volume controls work with the existing settings
  input methods and persist independently of the display profile.
- Confirm Captain speech and both taunt sets use the right events, do not
  overlap, stop in pause and defeat states, and do not play on attract screens.
- Verify attribution and license notices accompany any reused original assets.

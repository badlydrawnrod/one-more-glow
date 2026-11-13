# High scores and attract screens

**Status: Proposed. Implementation: Not started.** The original game's exact
high-score rules are not recalled; this proposal uses a conventional arcade
top-ten table and the flow described for this port.

- Keep the ten highest scores, ordered from highest to lowest. When a run ends,
  qualify its final score if it would appear in the top ten. If it qualifies,
  show an initials-entry screen before the score table. Otherwise, go directly
  to the score table. A score tied with the tenth-place score qualifies only
  if it would be inserted ahead of that entry; preserve existing entries ahead
  of a new tied score.
- Let the player enter up to three initials, including no initials at all.
  On a keyboard, accept letters directly, convert lowercase letters to
  uppercase, use backspace to correct, and Enter to submit. On a gamepad, use
  the left stick to select a character slot, the right stick's vertical
  direction to change that character, and Start to submit; the player can
  submit with no characters selected. Store the score and the initials as
  entered only when the player submits; then show the Top Scores screen.
- The Top Scores screen shows the ten entries in rank order, with rank,
  initials and score. The Main Menu screen shows the game title and a clear
  prompt to start. These screens replace the playfield and gameplay HUD.
- After Game Over, keep the player on the initials-entry screen until they
  submit, if their score qualified. The Top Scores and Main Menu screens then
  alternate every 30 seconds. A screen-advance input switches to the other
  screen immediately and restarts that screen's 30-second timer. Enter or
  Gamepad Start starts a fresh game from either screen; another gameplay
  button advances to the other screen.
- Preserve the top-ten table across runs and browser restarts using local
  browser storage. If storage is unavailable or invalid, start with an empty
  table and continue the game normally.

### High-score verification

- Check scores above, below and tied with tenth place, including insertion
  order and dropping the previous tenth-place entry when appropriate.
- Verify qualifying runs require initials before showing scores, while
  nonqualifying runs go straight to Top Scores. Check empty, partial and
  three-character entry; correction; lowercase-to-uppercase conversion;
  submission; and gamepad selection.
- Verify Top Scores and Main Menu alternate after 30 seconds, advance
  immediately on the screen-advance input, and each starts a fresh run on
  Enter or Gamepad Start.
- Verify entries survive a page reload and that missing, malformed or
  unavailable storage does not prevent play.

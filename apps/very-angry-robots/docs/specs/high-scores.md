# High scores and attract screens

**Status: Accepted. Implementation: Present.** The user has accepted the
current branded Main Menu and Top Scores screens, including the animated brand,
game title, red-robot gameplay vignette and screen layout. The score table, screen flow and
initials editor have automated coverage, including sequential keyboard entry,
correction, submission and mixed input. The new-entry highlight has no
dedicated automated coverage. The original game's exact high-score rules are
not recalled. This port uses the conventional arcade top-ten table below.

- Keep the ten highest scores, ordered from highest to lowest. When a run ends,
  qualify its final score if it would appear in the top ten. If it qualifies,
  show an initials-entry screen before the score table. Otherwise, go directly
  to the score table. A score tied with the tenth-place score qualifies only
  if it would be inserted ahead of that entry; preserve existing entries ahead
  of a new tied score.
- Let the player enter up to three initials, including no initials at all.
  On a keyboard, accept letters directly, convert lowercase letters to
  uppercase, use Backspace to remove the rightmost occupied slot, and use a
  fresh Enter press to submit. Keyboard entry fills the first empty slot,
  including after edits by touch or gamepad. Letters and Backspace may repeat
  while held. Arrow keys do not select a slot. To change an earlier letter,
  remove letters back to it and type forward again.
  On a gamepad, use
  the left stick to select a character slot, the right stick's vertical
  direction to change that character, and Start to submit; the player can
  submit with no characters selected. The left stick selects slots 1–3 from
  left to right, with slot 1 selected initially. The right stick cycles through
  blank and A–Z, wrapping in either direction. Highlight the active slot: after
  keyboard entry advance the highlight to the next slot, keep it on slot 3 when
  all three initials are filled, and move it back to the removed slot after
  Backspace. Store the score and the initials as entered only when the player
  submits; then show the Top Scores screen. Apply delivered keyboard and direct
  touch edits and submissions in event order. The first submission ends the
  editing session. Pending input from that session and held typing keys cannot
  act on the next screen. If the editor remains active at the next poll, apply
  sampled stick flicks to the slot first and the character second, then handle
  Gamepad Start. Touch and gamepad flicks on the same axis combine into one
  step when they agree and cancel when they oppose.
- The Top Scores screen shows the ten entries in rank order, with rank,
  initials and score. Show prominent One More Glow branding and the VERY ANGRY
  ROBOTS game title above its heading, using the same title size as the Main
  Menu. Place the score table and prompts lower to make room while keeping them
  clear of one another.
  On app startup, show the Main Menu screen. Give it strong, prominent One More
  Glow branding and make VERY ANGRY ROBOTS the main title. On both screens,
  animate only the word GLOW in the brand with a repeating pale-cyan-to-amber
  color cycle, matching the Asteroids title treatment; keep it static when
  reduced motion is preferred. Use the available title space for a gameplay
  vignette showing the player firing at several same-sized red hostile robots,
  with robot return fire. Use the game's room proportions, outlined double-line
  maze walls and doorway treatment. Keep the vignette free of a HUD and
  independent of game state.
  Keep the title, start prompt and controls easy to read. Align the play,
  navigation and settings prompts vertically across the Main Menu and Top
  Scores screens. These screens replace the playfield and gameplay HUD. Draw all
  high-score and attract screens in the existing canvas using the app's current
  drawing API; do not build their UI with HTML. Highlight a score just submitted
  through initials entry on the Top Scores screen so the player can identify
  their row. Keep it highlighted while the attract screens alternate, until
  the next game starts.
- After Game Over, keep the player on the initials-entry screen until they
  submit, if their score qualified. The Top Scores and Main Menu screens then
  alternate every 30 seconds. A screen-advance input switches to the other
  screen immediately and restarts that screen's 30-second timer. Pressing
  Enter on the keyboard or Gamepad Start starts a fresh game from either
  screen; any gameplay direction input (WASD, arrow keys or either gamepad
  stick) advances to the other screen.
- Preserve the top-ten table across runs and browser restarts using local
  browser storage. If storage is unavailable or invalid, start with an empty
  table and continue the game normally.

### High-score verification

- Check scores above, below and tied with tenth place, including insertion
  order and dropping the previous tenth-place entry when appropriate.
- Verify qualifying runs require initials before showing scores, while
  nonqualifying runs go straight to Top Scores. Check empty, partial and
  three-character entry; correction; lowercase-to-uppercase conversion;
  submission; and gamepad selection. Enter A, A, Backspace and Enter between
  updates and verify that A is saved. Check letter and Backspace repeat,
  mixed keyboard and touch edit order, combined stick flicks, and input
  following submission.
- Verify Top Scores and Main Menu alternate after 30 seconds, advance
  immediately on the screen-advance input, and each starts a fresh run on
  Enter or Gamepad Start.
- Verify a newly submitted score is highlighted on Top Scores and stays
  highlighted when returning from Main Menu, then clears when the next game
  starts.
- Verify entries survive a page reload and that missing, malformed or
  unavailable storage does not prevent play.

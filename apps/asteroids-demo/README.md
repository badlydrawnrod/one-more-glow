# Asteroids

A single-player Asteroids game built with One More Glow. From the repository
root, run `npm run dev:asteroids` and open the local address printed by Vite.

## Controls

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Rotate | Left / Right or A / D | Left stick or D-pad |
| Thrust | Up or W | Left stick up, D-pad up or first face button |
| Fire | Space | Second face button |
| Hyperspace | Shift | Third face button |
| Start / restart | Enter | Start |
| Pause / resume | P | Start |

Fire can be held. Hyperspace and start/pause activate on a fresh press. The
spacecraft carries momentum, and the playfield wraps around its edges. Clearing
an asteroid wave advances to a faster wave; saucers enter periodically.

After game over, press Enter or gamepad Start to restart, or Escape or gamepad
B to return to the title screen. The title returns automatically after ten seconds.

Open **Settings** with S or gamepad Back/Select on the title or pause screen.
Pause the game first to adjust settings during a run. Controls appear inside
the canvas in the vector style beside a live sample scene. Use
Up and Down to select a control, Left and Right to adjust it, and Enter to
activate buttons. You can also use Tab or pointer clicks; with a standard
gamepad, use the D-pad to navigate and adjust, Back/Select to open, A to
increase, Y to reset, and B to close. Escape also closes settings. Display
choices are saved in this browser when local storage is available. New profiles
start with 1.0-pixel lines and points, 0.2 glow strength, and 1.0 glow spread;
existing saved preferences are retained. **Reset defaults** restores these
Asteroids-specific values.

Run the app simulation tests with `npm run test --workspace=asteroids-demo`.
Check the app types with `npm run check:asteroids` and build it with
`npm run build:asteroids` from the repository root.

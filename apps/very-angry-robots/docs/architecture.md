# Very Angry Robots architecture

## Simulation and presentation boundary

`src/game.ts` owns the mutable simulation state. `createGame`, `updateGame` and
`restartGame` are the operations that create or change it. The simulation does
not depend on rendering, audio, browser APIs or input devices. It returns
`GameEvent`s for discrete occurrences that presentation systems need to react
to, such as impacts, room changes and audio cues.

The main loop coordinates input, simulation updates and presentation. It holds
the mutable `Game` reference for simulation operations and a `GameView` typed
alias to the same object for presentation reads. Rendering helpers accept
`RoomView`, including for nested actors, arrays, room geometry and transition
snapshots. These deep readonly TypeScript views make the read-only relationship
visible to the type checker while allowing presentation code to read live
state.

The readonly view is a compile-time boundary over the same objects. Do not
copy, freeze or wrap the game state each frame to create it. Such runtime work
is unnecessary for the contract and would add allocation or traversal to the
frame loop. Simulation mutation remains owned by `game.ts`; presentation
systems use events or their readonly view and keep their own transient state
separately.

This boundary is intended to reduce accidental data coupling, not to hide game
state from the main loop or require a separate rendering model. If the app
later needs stronger runtime isolation, it should be introduced for a concrete
need and measured against the frame loop.

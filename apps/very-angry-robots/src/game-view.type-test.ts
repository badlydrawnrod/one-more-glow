import type { Game, GameView } from "./game.ts";

type Assert<Condition extends true> = Condition;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type UpdateGameInput = Parameters<typeof import("./game.ts").updateGame>[0];
type RestartGameInput = Parameters<typeof import("./game.ts").restartGame>[0];
type MutableSimulationApiContract = [
  Assert<IsAssignable<Game, UpdateGameInput>>,
  Assert<IsAssignable<Game, RestartGameInput>>,
  Assert<IsAssignable<GameView, UpdateGameInput> extends false ? true : false>,
  Assert<IsAssignable<GameView, RestartGameInput> extends false ? true : false>,
];

export type GameViewTypeContract = MutableSimulationApiContract;

/** Compile-time assertions included by the app's `tsc --noEmit` check. */
export function assertGameViewTypes(view: GameView): void {
  const score: number = view.score;
  void score;

  // @ts-expect-error Presentation code cannot change scalar simulation state.
  view.score = 0;
  // @ts-expect-error Nested actor fields are readonly too.
  view.player.x = 0;
  // @ts-expect-error Simulation collections cannot be changed through the view.
  view.robots.push(view.robots[0]);
  // @ts-expect-error Nested room geometry and its arrays are readonly.
  view.geometry.wallRects[0].x = 0;

  if (view.transition) {
    // @ts-expect-error Transition snapshots expose readonly actor collections.
    view.transition.from.robots.push(view.player);
    // @ts-expect-error Nested values in transition snapshots are readonly.
    view.transition.to.player.y = 0;
  }
}

# Score and robot difficulty progression

**Status: Accepted. Implementation: Present.** Automated tests cover the
progression rules. The colours, shot speeds and combat balance have not yet
been playtested. This extension follows
the original's
[difficulty manager](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/ScoreBasedDifficultyManager.java),
[scoring rules](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/StatusManager.java)
and [configuration](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/data/veryangryrobots.properties).

### Scoring

- Start each run at zero and show the current score in the HUD. Restarting
  begins a new run and resets the score.
- Award 50 points for every robot destroyed, whether by a player shot, a wall,
  a robot shot or a collision. Award a further 100 points when the last robot
  in the room is destroyed. Award each robot and room-clear bonus at most once.
- The score carries between rooms. Leaving with robots alive is allowed and
  earns no room-clear bonus. Repopulating a room on entry creates a new set of
  robots that can be scored again.

### Difficulty tiers

Select the tier using the score when a room is populated. The colour, robot
count, shot limit and shot speed are fixed for that room; score changes during
combat affect the next room. All robots in a room use the tier's colour and
share the same pursuit behavior.

| Score from | Robot colour | Maximum robot shots in flight | Shot speed |
| ---: | --- | ---: | --- |
| 0 | Dark yellow | 0 | Slow |
| 300 | Red | 1 | Slow |
| 1,000 | Dark cyan | 2 | Slow |
| 2,000 | Green | 3 | Slow |
| 4,000 | Dark purple | 4 | Slow |
| 5,000 | Light yellow | 5 | Slow |
| 6,000 | White | 1 | Fast |
| 8,000 | Dark cyan | 2 | Fast |
| 10,000 | Light purple | 3 | Fast |
| 12,500 | Grey | 4 | Fast |
| 15,000 | Dark yellow | 5 | Fast |
| 20,000 | Red | 6 | Fast |

- Each threshold includes its stated score and applies until the next
  threshold; the final tier has no upper score limit. Robot colours should be
  visibly distinguishable against the room while retaining the vector glow.
- The shot limit is shared by all robots in the room, not a limit per robot.
  At zero, robots can still pursue and collide but cannot fire. Shots remain
  subject to the existing line-of-sight and collision rules.
- Use two distinct shot speeds. The original's configured slow and fast speeds
  are 4.6875 and 6.0 world units per second respectively; adapt their absolute
  values to this game's dimensions and tune through playtesting, preserving
  the fast-to-slow ratio of approximately 1.28 as a starting point. The
  current speeds are 235 and 300.8 room pixels per second, pending playtesting.
- Start with six robots. On entering a room in a different tier, reset the
  population to six. If the score changed since the previous room was
  populated but remains in the same noninitial tier, increase the population
  by three, up to twelve. If the score did not change, retain the previous
  population. In the initial tier, retain six. Apply this to the score at entry,
  including when several thresholds were crossed in the preceding room.
- Room coordinates determine maze layout; current score determines difficulty
  on every entry, including revisits. A revisit does not restore an earlier
  room's robot population or difficulty.

### Progression verification

- Verify every threshold immediately below and at its score, including the
  switch from slow yellow robots to fast white robots at 6,000 points.
- Verify the shared shot cap, including no shots in the initial tier, and
  confirm a robot may fire again when an existing shot disappears.
- Verify score awards for all destruction causes, the final-robot bonus,
  simultaneous destruction, leaving an uncleared room and revisiting a room.
- Verify six, nine and twelve robot populations within a tier, the reset on
  a tier change, no increase without a score change, the initial-tier rule,
  skipped thresholds and a fresh run's reset to zero and six robots.
- Verify that a score threshold crossed in a room does not alter its current
  robots or shots, but applies when the next room is entered.

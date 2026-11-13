import test from "node:test";
import assert from "node:assert/strict";
import {
  HIGH_SCORE_LIMIT,
  insertHighScore,
  loadHighScores,
  qualifiesForHighScore,
  saveHighScores,
} from "./high-scores.ts";

const entry = (initials, score) => ({ initials, score });

function storage(initial = null) {
  let value = initial;
  return {
    getItem() { return value; },
    setItem(_key, next) { value = next; },
    value: () => value,
  };
}

test("qualification and insertion keep the top ten with stable ties", () => {
  const scores = [entry("AAA", 900), entry("BBB", 700), entry("CCC", 700)];
  assert.equal(qualifiesForHighScore(scores, 700), true);
  assert.equal(qualifiesForHighScore(scores, 0), true);
  assert.deepEqual(insertHighScore(scores, entry("NEW", 700)), [
    entry("AAA", 900), entry("BBB", 700), entry("CCC", 700), entry("NEW", 700),
  ]);
  assert.deepEqual(scores, [entry("AAA", 900), entry("BBB", 700), entry("CCC", 700)]);

  const full = Array.from({ length: HIGH_SCORE_LIMIT }, (_, index) => entry(`P${index}`, 100 - index));
  assert.equal(qualifiesForHighScore(full, 90), false);
  assert.equal(qualifiesForHighScore(full, 91), false);
  assert.equal(qualifiesForHighScore(full, 92), true);
  assert.deepEqual(insertHighScore(full, entry("TIE", 91)), full);
  const inserted = insertHighScore(full, entry("NEW", 97));
  assert.equal(inserted.length, HIGH_SCORE_LIMIT);
  assert.deepEqual(inserted.slice(2, 5), [entry("P2", 98), entry("P3", 97), entry("NEW", 97)]);
});

test("an entry with no initials is valid and can be loaded after submission", () => {
  const anonymous = entry("", 650);
  const scores = insertHighScore([], anonymous);
  assert.deepEqual(scores, [anonymous]);
  assert.deepEqual(loadHighScores(() => storage(JSON.stringify(scores))), scores);
});

test("load returns a copied valid table and empty for absent, malformed, or invalid data", () => {
  const expected = [entry("ACE", 1200), entry("BOB", 900)];
  const loaded = loadHighScores(() => storage(JSON.stringify(expected)));
  assert.deepEqual(loaded, expected);
  assert.notEqual(loaded, expected);
  assert.notEqual(loaded[0], expected[0]);

  for (const raw of [null, "{", "{}", JSON.stringify([entry("ACE", -1)]),
    JSON.stringify([entry("ACE", 100), entry("BOB", 200)]),
    JSON.stringify(Array.from({ length: HIGH_SCORE_LIMIT + 1 }, () => entry("ACE", 1)))]) {
    assert.deepEqual(loadHighScores(() => storage(raw)), []);
  }
  assert.deepEqual(loadHighScores(() => { throw new Error("storage blocked"); }), []);
  assert.deepEqual(loadHighScores(() => undefined), []);
});

test("save persists valid sorted entries and contains storage failures", () => {
  const scores = [entry("ACE", 1200), entry("BOB", 900)];
  const store = storage();
  saveHighScores(() => store, scores);
  assert.deepEqual(JSON.parse(store.value()), scores);
  saveHighScores(() => { throw new Error("storage blocked"); }, scores);
  saveHighScores(() => ({ getItem() { return null; }, setItem() { throw new Error("quota"); } }), scores);
  saveHighScores(() => store, [entry("BAD", -1)]);
});

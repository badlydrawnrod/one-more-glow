import assert from "node:assert/strict";
import test from "node:test";
import { createCanvasRenderer } from "../src/canvas-renderer.ts";

type Call = [string, ...number[]];

function fakeContext() {
  const calls: Call[] = [];
  const canvas = { width: 320, height: 200 };
  const context = {
    canvas,
    strokeStyle: "",
    fillStyle: "",
    globalAlpha: 1,
    clearRect: (...args: number[]) => calls.push(["clearRect", ...args]),
    beginPath: () => calls.push(["beginPath"]),
    moveTo: (...args: number[]) => calls.push(["moveTo", ...args]),
    lineTo: (...args: number[]) => calls.push(["lineTo", ...args]),
    stroke: () => calls.push(["stroke"]),
    arc: (...args: number[]) => calls.push(["arc", ...args]),
    fill: () => calls.push(["fill"]),
  } as unknown as CanvasRenderingContext2D;
  return { calls, context };
}

test("beginFrame clears the canvas and resets the pen position", () => {
  const { calls, context } = fakeContext();
  const display = createCanvasRenderer(context);

  display.lineTo(10, 20);
  display.beginFrame();
  display.lineTo(30, 40);

  assert.deepEqual(calls, [["clearRect", 0, 0, 320, 200]]);
});

test("baseline beam uses a thin stroke with rounded ends", () => {
  const { context } = fakeContext();
  createCanvasRenderer(context);

  assert.equal(context.lineWidth, 1.5);
  assert.equal(context.lineCap, "round");
});

test("lineTo draws from the moved position and leaves the pen at its endpoint", () => {
  const { calls, context } = fakeContext();
  const display = createCanvasRenderer(context);

  display.beginFrame();
  display.moveTo(1, 2);
  display.lineTo(3, 4);
  display.lineTo(5, 6);

  assert.deepEqual(calls.filter(([name]) => ["moveTo", "lineTo", "stroke"].includes(name)), [
    ["moveTo", 1, 2],
    ["lineTo", 3, 4],
    ["stroke"],
    ["moveTo", 3, 4],
    ["lineTo", 5, 6],
    ["stroke"],
    ["moveTo", 5, 6],
  ]);
});

test("colour channels and intensity are clamped and points use the current style", () => {
  const { context, calls } = fakeContext();
  const display = createCanvasRenderer(context);

  display.setColor([-1, 0.5, 2]);
  display.setIntensity(3);
  display.point(7, 8);

  assert.equal(context.fillStyle, "rgb(0 128 255)");
  assert.equal(context.globalAlpha, 1);
  assert.deepEqual(calls.filter(([name]) => ["arc", "fill"].includes(name)), [
    ["arc", 7, 8, 1.5, 0, Math.PI * 2],
    ["fill"],
  ]);
});

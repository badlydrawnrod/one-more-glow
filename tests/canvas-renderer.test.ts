import assert from "node:assert/strict";
import test from "node:test";
import { createCanvasRenderer } from "../src/canvas-renderer.ts";

type Call = [string, ...number[]];

function fakeContext() {
  const calls: Call[] = [];
  const haloCalls: Call[] = [];
  function makeContext(canvas: { width: number; height: number }, log: Call[]) {
    let compositeOperation = "source-over";
    return {
      canvas,
      strokeStyle: "",
      fillStyle: "",
      globalAlpha: 1,
      get globalCompositeOperation() { return compositeOperation; },
      set globalCompositeOperation(value: string) { compositeOperation = value; },
      clearRect: (...args: number[]) => log.push(["clearRect", ...args]),
      beginPath: () => log.push(["beginPath"]),
      moveTo: (...args: number[]) => log.push(["moveTo", ...args]),
      lineTo: (...args: number[]) => log.push(["lineTo", ...args]),
      stroke: () => log.push([
        compositeOperation === "destination-out" ? "eraseStroke" : "stroke",
      ]),
      arc: (...args: number[]) => log.push(["arc", ...args]),
      fill: () => log.push([
        compositeOperation === "destination-out" ? "eraseFill" : "fill",
      ]),
      drawImage: (...args: number[]) => log.push(["drawImage", ...args]),
    };
  }
  let haloContext: ReturnType<typeof makeContext>;
  const haloCanvas = {
    width: 0,
    height: 0,
    getContext: () => haloContext,
  };
  haloContext = makeContext(haloCanvas, haloCalls);
  const canvas = {
    width: 320,
    height: 200,
    ownerDocument: { createElement: () => haloCanvas },
  };
  const context = makeContext(canvas, calls) as unknown as CanvasRenderingContext2D;
  return { calls, haloCalls, context };
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

test("lines and points composite an isolated halo before their sharp core", () => {
  const { context, calls, haloCalls } = fakeContext();
  const display = createCanvasRenderer(context);

  display.beginFrame();
  display.moveTo(1, 2);
  display.lineTo(3, 4);
  display.point(7, 8);

  assert.deepEqual(
    calls.filter(([name]) => ["drawImage", "stroke", "fill"].includes(name))
      .map(([name]) => name),
    ["drawImage", "stroke", "stroke", "drawImage", "fill", "fill"],
  );
  assert.equal(context.shadowBlur, 0);
  assert.equal(context.lineWidth, 1.5);
  assert.equal(context.shadowColor, "rgb(255 255 255)");
  assert.deepEqual(haloCalls.filter(([name]) => ["stroke", "eraseStroke", "fill", "eraseFill"].includes(name))
    .map(([name]) => name), [
      "stroke", "stroke", "stroke", "eraseStroke",
      "fill", "fill", "fill", "eraseFill",
    ]);
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
    ["stroke"],
    ["moveTo", 3, 4],
    ["lineTo", 5, 6],
    ["stroke"],
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

  assert.equal(context.shadowColor, "rgb(0 128 255)");
  assert.equal(context.fillStyle, "rgb(217 236 255)");
  assert.equal(context.globalAlpha, 1);
  assert.deepEqual(calls.filter(([name]) => ["arc", "fill"].includes(name)), [
    ["arc", 7, 8, 1.5, 0, Math.PI * 2],
    ["fill"],
    ["fill"],
  ]);
});

test("higher intensity moves the beam core closer to white", () => {
  function coreColorAt(intensity: number): string {
    const { context } = fakeContext();
    const display = createCanvasRenderer(context);
    display.setColor([0, 0.2, 0.4]);
    display.setIntensity(intensity);
    display.point(1, 1);
    return context.fillStyle;
  }

  const dimCore = coreColorAt(0.25);
  const brightCore = coreColorAt(1);
  assert.notEqual(dimCore, brightCore);
  assert.ok(Number(brightCore.match(/rgb\((\d+)/)?.[1]) > Number(dimCore.match(/rgb\((\d+)/)?.[1]));
});

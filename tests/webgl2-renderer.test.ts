import assert from "node:assert/strict";
import test from "node:test";
import { createWebGL2Renderer } from "../src/webgl2-renderer.ts";

function fakeContext() {
  const calls: Array<[string, ...unknown[]]> = [];
  let nextId = 0;
  const gl = {
    canvas: { width: 320, height: 200 },
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    FLOAT: 6,
    BLEND: 7,
    SRC_ALPHA: 8,
    ONE_MINUS_SRC_ALPHA: 9,
    COLOR_BUFFER_BIT: 10,
    STREAM_DRAW: 11,
    LINES: 12,
    POINTS: 13,
    TRIANGLES: 14,
    createShader: () => ({ id: nextId++ }),
    shaderSource: (...args: unknown[]) => calls.push(["shaderSource", ...args]),
    compileShader: (...args: unknown[]) => calls.push(["compileShader", ...args]),
    getShaderParameter: () => true,
    getShaderInfoLog: () => "",
    deleteShader: (...args: unknown[]) => calls.push(["deleteShader", ...args]),
    createProgram: () => ({ id: nextId++ }),
    attachShader: (...args: unknown[]) => calls.push(["attachShader", ...args]),
    linkProgram: (...args: unknown[]) => calls.push(["linkProgram", ...args]),
    getProgramParameter: () => true,
    getProgramInfoLog: () => "",
    deleteProgram: (...args: unknown[]) => calls.push(["deleteProgram", ...args]),
    createBuffer: () => ({ id: nextId++ }),
    getAttribLocation: () => 0,
    getUniformLocation: (_program: unknown, name: string) => name,
    useProgram: (...args: unknown[]) => calls.push(["useProgram", ...args]),
    bindBuffer: (...args: unknown[]) => calls.push(["bindBuffer", ...args]),
    enableVertexAttribArray: (...args: unknown[]) => calls.push(["enableVertexAttribArray", ...args]),
    vertexAttribPointer: (...args: unknown[]) => calls.push(["vertexAttribPointer", ...args]),
    enable: (...args: unknown[]) => calls.push(["enable", ...args]),
    blendFunc: (...args: unknown[]) => calls.push(["blendFunc", ...args]),
    uniform2f: (...args: unknown[]) => calls.push(["uniform2f", ...args]),
    uniform3f: (...args: unknown[]) => calls.push(["uniform3f", ...args]),
    uniform1f: (...args: unknown[]) => calls.push(["uniform1f", ...args]),
    uniform1i: (...args: unknown[]) => calls.push(["uniform1i", ...args]),
    viewport: (...args: unknown[]) => calls.push(["viewport", ...args]),
    clearColor: (...args: unknown[]) => calls.push(["clearColor", ...args]),
    clear: (...args: unknown[]) => calls.push(["clear", ...args]),
    bufferData: (...args: unknown[]) => calls.push(["bufferData", ...args]),
    drawArrays: (...args: unknown[]) => calls.push(["drawArrays", ...args]),
    flush: () => calls.push(["flush"]),
  } as unknown as WebGL2RenderingContext;
  return { calls, gl };
}

test("WebGL2 renderer clears per frame and submits line segments and points", () => {
  const { calls, gl } = fakeContext();
  const display = createWebGL2Renderer(gl);

  display.beginFrame();
  display.lineTo(99, 99);
  display.moveTo(10, 20);
  display.lineTo(30, 40);
  display.point(50, 60);
  display.endFrame();

  assert.deepEqual(calls.filter(([name]) => name === "drawArrays"), [
    ["drawArrays", gl.TRIANGLES, 0, 6],
    ["drawArrays", gl.POINTS, 0, 1],
  ]);
  assert.deepEqual(calls.filter(([name]) => name === "clear"), [["clear", gl.COLOR_BUFFER_BIT]]);
  assert.deepEqual(calls.filter(([name]) => name === "flush"), [["flush"]]);
});

test("WebGL2 renderer applies normalized colour and clamped intensity", () => {
  const { calls, gl } = fakeContext();
  const display = createWebGL2Renderer(gl);

  display.setColor([-1, 0.5, 2]);
  display.setIntensity(2);

  assert.ok(calls.some((call) => call[0] === "uniform3f" && call[2] === 0 && call[3] === 0.5 && call[4] === 1));
  assert.ok(calls.some((call) => call[0] === "uniform1f" && call[2] === 1));
});

import type { Color, DrawingContext } from "./graphics.ts";

const vertexSource = `#version 300 es
in vec2 position;
uniform vec2 resolution;
void main() {
  vec2 clip = (position / resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = 2.0;
}`;

const fragmentSource = `#version 300 es
precision mediump float;
uniform vec3 color;
uniform float intensity;
out vec4 outputColor;
void main() {
  outputColor = vec4(color, intensity);
}`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL2 shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compilation error";
    gl.deleteShader(shader);
    throw new Error(`Unable to compile WebGL2 shader: ${message}`);
  }
  return shader;
}

/** Create a WebGL2 implementation of the renderer-independent drawing API. */
export function createWebGL2Renderer(gl: WebGL2RenderingContext): DrawingContext {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create WebGL2 program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown program link error";
    gl.deleteProgram(program);
    throw new Error(`Unable to link WebGL2 program: ${message}`);
  }

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    throw new Error("Unable to create WebGL2 vertex buffer");
  }
  const positionLocation = gl.getAttribLocation(program, "position");
  const resolutionLocation = gl.getUniformLocation(program, "resolution");
  const colorLocation = gl.getUniformLocation(program, "color");
  const intensityLocation = gl.getUniformLocation(program, "intensity");

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

  let color: Color = [1, 1, 1];
  let intensity = 1;
  let position: readonly [number, number] | undefined;

  function applyStyle(): void {
    gl.uniform3f(colorLocation, color[0], color[1], color[2]);
    gl.uniform1f(intensityLocation, intensity);
  }

  function draw(x: number, y: number, mode: number, from?: readonly [number, number]): void {
    const vertices = from ? [...from, x, y] : [x, y];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.drawArrays(mode, 0, vertices.length / 2);
  }

  applyStyle();
  return {
    beginFrame() {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      position = undefined;
    },
    endFrame() {
      gl.flush();
    },
    setColor(nextColor) {
      color = [
        Math.max(0, Math.min(1, nextColor[0])),
        Math.max(0, Math.min(1, nextColor[1])),
        Math.max(0, Math.min(1, nextColor[2])),
      ];
      applyStyle();
    },
    setIntensity(value) {
      intensity = Math.max(0, Math.min(1, value));
      applyStyle();
    },
    moveTo(x, y) {
      position = [x, y];
    },
    lineTo(x, y) {
      if (!position) return;
      applyStyle();
      draw(x, y, gl.LINES, position);
      position = [x, y];
    },
    point(x, y) {
      applyStyle();
      draw(x, y, gl.POINTS);
    },
  };
}

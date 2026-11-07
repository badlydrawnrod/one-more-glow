import type { Color, DrawingContext } from "./graphics.ts";

const vertexSource = `#version 300 es
in vec2 position;
in vec2 edge;
uniform vec2 resolution;
out vec2 edgePosition;
void main() {
  vec2 clip = (position / resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = 2.0;
  edgePosition = edge;
}`;

const fragmentSource = `#version 300 es
precision mediump float;
uniform vec3 color;
uniform float intensity;
uniform float segmentLength;
uniform bool smoothLine;
in vec2 edgePosition;
out vec4 outputColor;
void main() {
  float coverage = 1.0;
  if (smoothLine) {
    vec2 distanceFromEdge = abs(edgePosition) - vec2(segmentLength * 0.5, 0.5);
    float distance = length(max(distanceFromEdge, 0.0)) + min(max(distanceFromEdge.x, distanceFromEdge.y), 0.0);
    coverage = 1.0 - smoothstep(-0.5, 0.5, distance);
  }
  outputColor = vec4(color, intensity * coverage);
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
  const edgeLocation = gl.getAttribLocation(program, "edge");
  const resolutionLocation = gl.getUniformLocation(program, "resolution");
  const colorLocation = gl.getUniformLocation(program, "color");
  const intensityLocation = gl.getUniformLocation(program, "intensity");
  const segmentLengthLocation = gl.getUniformLocation(program, "segmentLength");
  const smoothLineLocation = gl.getUniformLocation(program, "smoothLine");

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(edgeLocation);
  gl.vertexAttribPointer(edgeLocation, 2, gl.FLOAT, false, 16, 8);
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

  function drawPoint(x: number, y: number): void {
    gl.uniform1i(smoothLineLocation, 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x, y, 0, 0]), gl.STREAM_DRAW);
    gl.drawArrays(gl.POINTS, 0, 1);
  }

  function drawLine(from: readonly [number, number], to: readonly [number, number]): void {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    if (length === 0) return;

    const tangentX = dx / length;
    const tangentY = dy / length;
    const normalX = -tangentY;
    const normalY = tangentX;
    const corners = [
      [-1, -1], [length + 1, -1], [-1, 1],
      [-1, 1], [length + 1, -1], [length + 1, 1],
    ];
    const vertices: number[] = [];
    for (const [along, across] of corners) {
      vertices.push(
        from[0] + tangentX * along + normalX * across,
        from[1] + tangentY * along + normalY * across,
        along - length * 0.5,
        across,
      );
    }

    gl.uniform1f(segmentLengthLocation, length);
    gl.uniform1i(smoothLineLocation, 1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
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
      drawLine(position, [x, y]);
      position = [x, y];
    },
    point(x, y) {
      applyStyle();
      drawPoint(x, y);
    },
  };
}

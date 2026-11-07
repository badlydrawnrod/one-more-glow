import type { Color, DrawingContext } from "./graphics.ts";

const vertexSource = `#version 300 es
in vec2 startPoint;
in vec2 endPoint;
in vec3 color;
in float intensity;
in float primitiveKind;
uniform vec2 resolution;
out vec3 beamColor;
out float beamIntensity;
out vec2 edgePosition;
flat out float beamLength;
flat out float beamKind;
void main() {
  const vec2 corners[6] = vec2[6](
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
  );
  vec2 corner = corners[gl_VertexID];
  beamColor = color;
  beamIntensity = intensity;
  beamKind = primitiveKind;
  vec2 position;
  if (primitiveKind < 0.5) {
    vec2 delta = endPoint - startPoint;
    beamLength = length(delta);
    vec2 tangent = delta / max(beamLength, 0.0001);
    vec2 normal = vec2(-tangent.y, tangent.x);
    float along = corner.x * (beamLength * 0.5 + 1.75);
    float across = corner.y * 1.75;
    position = (startPoint + endPoint) * 0.5 + tangent * along + normal * across;
    edgePosition = vec2(along, across);
  } else {
    beamLength = 0.0;
    edgePosition = corner * 2.5;
    position = startPoint + edgePosition;
  }
  vec2 clip = (position / resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision mediump float;
in vec3 beamColor;
in float beamIntensity;
in vec2 edgePosition;
flat in float beamLength;
flat in float beamKind;
out vec4 outputColor;
void main() {
  float signedDistance;
  if (beamKind < 0.5) {
    float along = clamp(edgePosition.x, -beamLength * 0.5, beamLength * 0.5);
    signedDistance = length(edgePosition - vec2(along, 0.0)) - 0.75;
  } else {
    signedDistance = length(edgePosition) - 1.5;
  }
  float coverage = 1.0 - smoothstep(-0.5, 0.5, signedDistance);
  outputColor = vec4(beamColor, beamIntensity * coverage);
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
  const startLocation = gl.getAttribLocation(program, "startPoint");
  const endLocation = gl.getAttribLocation(program, "endPoint");
  const colorLocation = gl.getAttribLocation(program, "color");
  const intensityLocation = gl.getAttribLocation(program, "intensity");
  const kindLocation = gl.getAttribLocation(program, "primitiveKind");
  const resolutionLocation = gl.getUniformLocation(program, "resolution");

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
  for (const [location, size, offset] of [
    [startLocation, 2, 0],
    [endLocation, 2, 8],
    [colorLocation, 3, 16],
    [intensityLocation, 1, 28],
    [kindLocation, 1, 32],
  ]) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(location, 1);
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

  let color: Color = [1, 1, 1];
  let intensity = 1;
  let position: readonly [number, number] | undefined;
  let commands: number[][] = [];
  return {
    beginFrame() {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      position = undefined;
      commands = [];
    },
    endFrame() {
      if (commands.length > 0) {
        const vertices = new Float32Array(commands.flat());
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, commands.length);
      }
      gl.flush();
    },
    setColor(nextColor) {
      color = [
        Math.max(0, Math.min(1, nextColor[0])),
        Math.max(0, Math.min(1, nextColor[1])),
        Math.max(0, Math.min(1, nextColor[2])),
      ];
    },
    setIntensity(value) {
      intensity = Math.max(0, Math.min(1, value));
    },
    moveTo(x, y) {
      position = [x, y];
    },
    lineTo(x, y) {
      if (!position) return;
      if (position[0] !== x || position[1] !== y) {
        commands.push([
          position[0], position[1], x, y,
          color[0], color[1], color[2], intensity, 0,
        ]);
      }
      position = [x, y];
    },
    point(x, y) {
      commands.push([x, y, x, y, color[0], color[1], color[2], intensity, 1]);
    },
  };
}

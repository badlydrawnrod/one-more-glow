import { DEFAULT_DISPLAY_PROFILE, type Color, type DisplayProfile, type DisplayRenderer, type RendererOptions } from "./graphics.ts";
import { createViewport, type Viewport } from "./viewport.ts";
import { createTransformStack } from "./transform.ts";

const vertexSource = `#version 300 es
precision highp float;
in vec2 startPoint;
in vec2 endPoint;
in vec3 color;
in float intensity;
in float primitiveKind;
uniform vec2 resolution;
uniform float pixelScale;
uniform float lineWidth;
uniform float pointRadius;
uniform float glowSpread;
out vec3 beamColor;
out float beamIntensity;
out vec2 edgePosition;
flat out float beamLength;
flat out float beamKind;

// Geometry is expanded in backing-store pixels so beam dimensions stay fixed
// in CSS pixels as the logical viewport scales.
const float HALO_EXTENT_PIXELS = 25.5;

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
    // Expand the line quad past both ends and sides to contain its halo.
    float haloExtent = (HALO_EXTENT_PIXELS * glowSpread + max(lineWidth * 0.5, pointRadius)) * pixelScale;
    float along = corner.x * (beamLength * 0.5 + haloExtent);
    float across = corner.y * haloExtent;
    position = (startPoint + endPoint) * 0.5 + tangent * along + normal * across;
    edgePosition = vec2(along, across);
  } else {
    beamLength = 0.0;
    // Points use a square quad; the fragment shader clips it to a circle.
    edgePosition = corner * ((HALO_EXTENT_PIXELS * glowSpread + max(lineWidth * 0.5, pointRadius)) * pixelScale);
    position = startPoint + edgePosition;
  }
  vec2 clip = (position / resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
in vec3 beamColor;
in float beamIntensity;
in vec2 edgePosition;
flat in float beamLength;
flat in float beamKind;
uniform float pixelScale;
uniform float lineWidth;
uniform float pointRadius;
uniform float glowStrength;
uniform float glowSpread;
out vec4 outputColor;

// Beam dimensions and falloff distances are in output pixels, then scaled to
// backing-store pixels by pixelScale.
const float BROAD_HALO_WEIGHT = 0.12;
const float BROAD_HALO_FALLOFF_SQUARED = 250.0;
const float INNER_HALO_WEIGHT = 0.07;
const float INNER_HALO_FALLOFF_SQUARED = 32.0;
const float HALO_FADE_START_PIXELS = 16.0;
const float HALO_CUTOFF_PIXELS = 25.0;
const float LINE_END_FADE_START_PIXELS = -4.0;
const float LINE_END_FADE_END_PIXELS = 10.0;

void main() {
  float signedDistance;
  if (beamKind < 0.5) {
    float along = clamp(edgePosition.x, -beamLength * 0.5, beamLength * 0.5);
    // Clamping to the segment endpoints makes the line core a rounded capsule.
    signedDistance = length(edgePosition - vec2(along, 0.0)) - lineWidth * 0.5 * pixelScale;
  } else {
    // Distance from the point centre gives a circular core.
    signedDistance = length(edgePosition) - pointRadius * pixelScale;
  }

  // Keep the core crisp with a narrow antialiased edge. Outside it, combine
  // two Gaussian bands into a coloured halo with a finite cutoff.
  float coreCoverage = 1.0 - smoothstep(-0.5, 0.5, signedDistance);
  float haloDistance = max(signedDistance, 0.0) / glowSpread;
  float halo = (BROAD_HALO_WEIGHT * exp(-haloDistance * haloDistance
      / (BROAD_HALO_FALLOFF_SQUARED * pixelScale * pixelScale))
    + INNER_HALO_WEIGHT * exp(-haloDistance * haloDistance
      / (INNER_HALO_FALLOFF_SQUARED * pixelScale * pixelScale)))
    * (1.0 - smoothstep(HALO_FADE_START_PIXELS * pixelScale,
      HALO_CUTOFF_PIXELS * pixelScale, haloDistance));
  float primitiveHalo = beamKind < 0.5 ? 1.0 : 0.45;
  halo *= primitiveHalo * glowStrength;
  if (beamKind < 0.5) {
    // Reduce halo strength near line ends to avoid prominent endpoint flares.
    float endDistance = beamLength * 0.5 - abs(edgePosition.x);
    halo *= mix(0.35, 1.0, smoothstep(
      LINE_END_FADE_START_PIXELS * pixelScale,
      LINE_END_FADE_END_PIXELS * pixelScale,
      endDistance));
  }

  // Normal intensity controls brightness; overdrive whitens only the core.
  float normalIntensity = min(beamIntensity, 1.0);
  float baseAlpha = normalIntensity
    * (coreCoverage + halo * (1.0 - coreCoverage));
  float coreAlpha = normalIntensity * coreCoverage;
  float alpha = coreAlpha + baseAlpha * (1.0 - coreAlpha);
  float whitening = 0.85 * smoothstep(1.0, 2.0, beamIntensity);
  vec3 coreColor = mix(beamColor, vec3(1.0), whitening);
  vec3 premultiplied = coreColor * coreAlpha
    + beamColor * baseAlpha * (1.0 - coreAlpha);
  outputColor = vec4(premultiplied / max(alpha, 0.0001), alpha);
}`;

const FLOATS_PER_COMMAND = 9;
const INITIAL_COMMAND_CAPACITY = 256;

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
export function createWebGL2Renderer(
  gl: WebGL2RenderingContext,
  options: RendererOptions = {},
): DisplayRenderer {
  function validateProfile(value: Readonly<DisplayProfile>): DisplayProfile {
    for (const [key, min, max] of [["lineWidth", 0.5, 4], ["pointRadius", 0.5, 4], ["glowStrength", 0, 2], ["glowSpread", 0.5, 2]] as const) {
      if (!Number.isFinite(value[key]) || value[key] < min || value[key] > max) throw new RangeError(`Invalid display profile ${key}`);
    }
    return { ...value };
  }
  let profile = validateProfile(options.profile ?? DEFAULT_DISPLAY_PROFILE);
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
  const pixelScaleLocation = gl.getUniformLocation(program, "pixelScale");
  const lineWidthLocation = gl.getUniformLocation(program, "lineWidth");
  const pointRadiusLocation = gl.getUniformLocation(program, "pointRadius");
  const glowStrengthLocation = gl.getUniformLocation(program, "glowStrength");
  const glowSpreadLocation = gl.getUniformLocation(program, "glowSpread");

  function viewport(): Viewport {
    const cssSize = "clientWidth" in gl.canvas
      ? [gl.canvas.clientWidth, gl.canvas.clientHeight] as const
      : [gl.canvas.width, gl.canvas.height] as const;
    return createViewport(
      gl.canvas.width,
      gl.canvas.height,
      cssSize[0],
      cssSize[1],
      options.orientation ?? "landscape",
    );
  }

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
  gl.uniform1f(pixelScaleLocation, viewport().pixelScale);

  let color: Color = [1, 1, 1];
  let intensity = 1;
  let position: readonly [number, number] | undefined;
  let commandData = new Float32Array(FLOATS_PER_COMMAND * INITIAL_COMMAND_CAPACITY);
  let commandCount = 0;
  let currentViewport = viewport();
  const transforms = createTransformStack();

  function appendCommand(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    commandColor: Color,
    commandIntensity: number,
    primitiveKind: number,
  ): void {
    if (commandCount === commandData.length / FLOATS_PER_COMMAND) {
      const larger = new Float32Array(commandData.length * 2);
      larger.set(commandData);
      commandData = larger;
    }
    const offset = commandCount * FLOATS_PER_COMMAND;
    commandData[offset] = startX;
    commandData[offset + 1] = startY;
    commandData[offset + 2] = endX;
    commandData[offset + 3] = endY;
    commandData[offset + 4] = commandColor[0];
    commandData[offset + 5] = commandColor[1];
    commandData[offset + 6] = commandColor[2];
    commandData[offset + 7] = commandIntensity;
    commandData[offset + 8] = primitiveKind;
    commandCount += 1;
  }

  return {
    setDisplayProfile(nextProfile) {
      profile = validateProfile(nextProfile);
    },
    beginFrame() {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
      currentViewport = viewport();
      gl.uniform1f(pixelScaleLocation, currentViewport.pixelScale);
      gl.uniform1f(lineWidthLocation, profile.lineWidth);
      gl.uniform1f(pointRadiusLocation, profile.pointRadius);
      gl.uniform1f(glowStrengthLocation, profile.glowStrength);
      gl.uniform1f(glowSpreadLocation, profile.glowSpread);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      position = undefined;
      commandCount = 0;
      transforms.reset();
    },
    endFrame() {
      if (commandCount > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          commandData.subarray(0, commandCount * FLOATS_PER_COMMAND),
          gl.STREAM_DRAW,
        );
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, commandCount);
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
      intensity = Math.max(0, Math.min(2, value));
    },
    pushTransform() {
      transforms.push();
    },
    popTransform() {
      transforms.pop();
    },
    translate(x, y) {
      transforms.translate(x, y);
    },
    rotate(angleDegrees) {
      transforms.rotate(angleDegrees);
    },
    scale(x, y) {
      transforms.scale(x, y);
    },
    moveTo(x, y) {
      position = transforms.apply(x, y);
    },
    lineTo(x, y) {
      if (!position) return;
      const nextPosition = transforms.apply(x, y);
      if (position[0] !== nextPosition[0] || position[1] !== nextPosition[1]) {
        const [startX, startY] = currentViewport.mapPoint(position[0], position[1]);
        const [endX, endY] = currentViewport.mapPoint(nextPosition[0], nextPosition[1]);
        appendCommand(startX, startY, endX, endY, color, intensity, 0);
      }
      position = nextPosition;
    },
    point(x, y) {
      const [logicalX, logicalY] = transforms.apply(x, y);
      const [outputX, outputY] = currentViewport.mapPoint(logicalX, logicalY);
      appendCommand(outputX, outputY, outputX, outputY, color, intensity, 1);
    },
  };
}

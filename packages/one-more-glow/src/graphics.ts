/** RGB components are normalized to the range 0–1. */
export type Color = readonly [red: number, green: number, blue: number];

/** Physical orientation of the imaginary console display. */
export type DisplayOrientation = "landscape" | "portrait";

/** Global presentation settings, with dimensions measured in CSS pixels. */
export interface DisplayProfile {
  lineWidth: number;
  pointRadius: number;
  glowStrength: number;
  glowSpread: number;
}

export const DEFAULT_DISPLAY_PROFILE: Readonly<DisplayProfile> = Object.freeze({
  lineWidth: 1.5,
  pointRadius: 1.5,
  glowStrength: 1,
  glowSpread: 1,
});

/** Display configuration shared by renderer implementations. */
export interface RendererOptions {
  orientation?: DisplayOrientation;
  profile?: Readonly<DisplayProfile>;
}

/** Renderer configuration, separate from per-command drawing state. */
export interface DisplayRenderer extends DrawingContext {
  setDisplayProfile(profile: Readonly<DisplayProfile>): void;
}

/** Immediate-mode drawing operations shared by display renderers. */
export interface DrawingContext {
  beginFrame(): void;
  endFrame(): void;
  setColor(color: Color): void;
  /** Beam intensity from 0 to 2; values above 1 engage overdrive. */
  setIntensity(value: number): void;
  pushTransform(): void;
  popTransform(): void;
  translate(x: number, y: number): void;
  rotate(angleDegrees: number): void;
  scale(x: number, y: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  point(x: number, y: number): void;
}

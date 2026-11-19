export interface CanvasSize {
  width: number;
  height: number;
}

export function fitCanvasSize(
  stage: CanvasSize,
  ratio: number,
  widthCap: number,
): CanvasSize {
  const width = Math.max(1, Math.min(stage.width, stage.height * ratio, widthCap));
  return { width, height: width / ratio };
}

export function backingSize(css: CanvasSize, scale: number): CanvasSize {
  return {
    width: Math.max(1, Math.round(css.width * scale)),
    height: Math.max(1, Math.round(css.height * scale)),
  };
}

export function genericMap(
  output: CanvasSize,
  virtual: CanvasSize,
  mapping: "fit" | "stretch",
): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {
  const x = output.width / virtual.width;
  const y = output.height / virtual.height;
  if (mapping === "stretch") return { scaleX: x, scaleY: y, offsetX: 0, offsetY: 0 };
  const scale = Math.min(x, y);
  return {
    scaleX: scale,
    scaleY: scale,
    offsetX: (output.width - virtual.width * scale) / 2,
    offsetY: (output.height - virtual.height * scale) / 2,
  };
}

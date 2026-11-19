export interface CanvasSize {
  width: number;
  height: number;
}

export function fitCanvasSize(
  stage: CanvasSize,
  ratio: number,
  widthCap: number,
): CanvasSize {
  const width = Math.min(stage.width, stage.height * ratio, widthCap);
  return { width, height: width / ratio };
}

export function planBackingAllocation(css: CanvasSize, requestedScale: number) {
  const maxSide = 8192;
  const maxPixels = 32_000_000;
  const requested = backingSize(css, requestedScale);
  const sideLimited = Math.max(requested.width, requested.height) > maxSide;
  const areaLimited = requested.width * requested.height > maxPixels;
  if (!sideLimited && !areaLimited) return { requested, applied: requested, scale: requestedScale, limit: null };

  const scale = Math.min(requestedScale, maxSide / Math.max(css.width, css.height), Math.sqrt(maxPixels / (css.width * css.height)));
  const applied = {
    width: Math.max(1, Math.floor(css.width * scale)),
    height: Math.max(1, Math.floor(css.height * scale)),
  };
  const limit = sideLimited && areaLimited ? "8192 px side and 32 MP allocation limits"
    : sideLimited ? "8192 px side limit" : "32 MP allocation limit";
  return { requested, applied, scale, limit };
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

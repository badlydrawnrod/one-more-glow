import { drawText, measureText, type DrawingContext } from "one-more-glow";

function drawStudyText(
  drawing: DrawingContext, text: string, x: number, y: number, height: number, design: "16" | "22",
): void {
  drawText(drawing, text, x, y, { font: design === "16" ? "segment16" : "segment22", height });
}

/** Compare the proposed cells using the same samples and drawing style. */
export function drawSegmentStudy(drawing: DrawingContext, portrait: boolean): void {
  const top = portrait ? 465 : 330;
  const large = portrait ? 37 : 32;
  const left = -16 * large * 0.82 / 2;
  const row = portrait ? 65 : 49;

  drawing.beginFrame();
  drawing.setColor([1, 0.55, 0.12]);
  drawing.setIntensity(0.8);
  drawStudyText(drawing, "16 SEGMENT", left, top - 20, 19, "16");
  drawing.setColor([0, 0.9, 1]);
  drawing.setIntensity(0.9);
  drawStudyText(drawing, "ABCDEFGHIJKLM", left, top - row - large, large, "16");
  drawStudyText(drawing, "NOPQRSTUVWXYZ", left, top - row * 2 - large, large, "16");
  drawStudyText(drawing, "0123456789", left, top - row * 3 - large, large, "16");
  drawing.setIntensity(0.7);
  drawStudyText(drawing, "SCORE 001250  WAVE 03", left, top - row * 4 - 20, 20, "16");

  drawing.setColor([1, 0.55, 0.12]);
  drawing.setIntensity(0.8);
  drawStudyText(drawing, "22 SEGMENT", left, top - row * 5 - 18, 18, "22");
  drawing.setColor([0, 0.9, 1]);
  drawing.setIntensity(0.9);
  // Six rows of the reference chart: ASCII 0x20 through 0x7e, followed by
  // the blank 0x7f cell. Preserve the space at the start of the first row.
  for (let line = 0; line < 6; line += 1) {
    const text = Array.from({ length: 16 }, (_, column) =>
      line === 5 && column === 15 ? " " : String.fromCharCode(0x20 + line * 16 + column)).join("");
    drawStudyText(drawing, text, left, top - row * (6 + line) - large, large, "22");
  }
  drawing.setIntensity(0.7);
  drawStudyText(drawing, "Score 001250  Wave 03", left, top - row * 12 - 20, 20, "22");
  const sample = "The quick brown fox jumps over the lazy dog.";
  const options = { font: "segment22", height: 24, spacing: "kerned" } as const;
  const width = measureText(sample, options).width;
  drawText(drawing, sample, -(width - 24 * 0.22) / 2, top - row * 13 - 24, options);
  drawing.endFrame();
}

/** Compare HUD text in each font and spacing mode at two sizes. */
export function drawSpacingStudy(drawing: DrawingContext, portrait: boolean): void {
  const left = portrait ? -320 : -460;
  const top = portrait ? 455 : 335;
  const groupHeight = portrait ? 205 : 160;
  const groups = [
    { font: "segment16", spacing: "fixed", label: "16 FIXED" },
    { font: "segment16", spacing: "kerned", label: "16 KERNED" },
    { font: "segment22", spacing: "fixed", label: "22 FIXED" },
    { font: "segment22", spacing: "kerned", label: "22 KERNED" },
  ] as const;

  drawing.beginFrame();
  groups.forEach(({ font, spacing, label }, index) => {
    const y = top - index * groupHeight;
    drawing.setColor([1, 0.55, 0.12]);
    drawing.setIntensity(0.65);
    drawText(drawing, label, left, y, { font: "segment16", height: 18 });
    drawing.setColor([0, 0.9, 1]);
    drawing.setIntensity(0.65);
    drawText(drawing, "SHIPS 03  EARTH: 1 SECTOR", left, y - 32, { font, spacing, height: 14 });
    drawText(drawing, "SCORE 001200  WAVE 11", left, y - 56, { font, spacing, height: 14 });
    drawText(drawing, "VELOCITY 000  0123456789", left, y - 84, { font, spacing, height: 20 });
  });
  drawing.endFrame();
}

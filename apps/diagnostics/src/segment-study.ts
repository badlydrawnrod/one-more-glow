import { drawText, measureText, type DrawingContext } from "one-more-glow";

const cyan = [0, 0.9, 1] as const;
const amber = [1, 0.55, 0.12] as const;

export function drawSegmentStudy(drawing: DrawingContext, portrait: boolean): void {
  const width = portrait ? 768 : 1024;
  const height = portrait ? 1024 : 768;
  const left = -width * 0.41;
  const title = { font: "segment16", height: width * 0.023 } as const;
  const sampleHeight = width * 0.022;
  const chartHeight = width * 0.035;
  const matchedText = "PLAYER 1  SCORE 01250";

  drawing.beginFrame();
  for (const [font, fontName, y] of [["segment16", "16", 0.397], ["segment22", "22", 0.34]] as const) {
    drawing.setIntensity(0.78);
    drawing.setColor(amber);
    drawText(drawing, fontName, left, height * y, title);
    drawing.setColor(cyan);
    drawText(drawing, matchedText, left + width * 0.088, height * y, { font, height: sampleHeight });
  }

  drawing.setColor(amber);
  drawText(drawing, "16-SEGMENT CHART", left, height * 0.222, title);
  drawing.setColor(cyan);
  drawText(drawing, "ABCDEFGHIJKLM", left, height * 0.154, { font: "segment16", height: chartHeight });
  drawText(drawing, "NOPQRSTUVWXYZ", left, height * 0.09, { font: "segment16", height: chartHeight });
  drawText(drawing, "0123456789", width * 0.105, height * 0.154, { font: "segment16", height: chartHeight });

  drawing.setColor(amber);
  drawText(drawing, "22-SEGMENT CHART", left, height * -0.007, title);
  drawing.setColor(cyan);
  // Six rows of sixteen cells preserve the full 0x20–0x7f reference chart.
  for (let row = 0; row < 6; row += 1) {
    const text = Array.from({ length: 16 }, (_, column) =>
      row === 5 && column === 15 ? " " : String.fromCharCode(0x20 + row * 16 + column)).join("");
    drawText(drawing, text, left, height * (-0.077 - row * 0.068), { font: "segment22", height: chartHeight });
  }
  drawing.endFrame();
}

export function drawSpacingStudy(drawing: DrawingContext, portrait: boolean): void {
  const width = portrait ? 768 : 1024;
  const height = portrait ? 1024 : 768;
  const columns = [["fixed", -width * 0.41], ["kerned", width * 0.06]] as const;
  const heading = { font: "segment16", height: width * 0.025 } as const;
  const groups = [
    ["segment16", "16 SMALL", 0.021], ["segment22", "22 SMALL", 0.021],
    ["segment16", "16 LARGE", 0.029], ["segment22", "22 LARGE", 0.029],
  ] as const;

  drawing.beginFrame();
  for (const [spacing, x] of columns) {
    drawing.setColor(cyan);
    drawing.setIntensity(0.8);
    drawText(drawing, spacing.toUpperCase(), x, height * 0.41, heading);
    for (const [index, [font, title, size]] of groups.entries()) {
      const y = height * (0.295 - index * 0.19);
      drawing.setColor(amber);
      drawing.setIntensity(0.8);
      drawText(drawing, title, x, y, heading);

      const options = { font, height: width * size, spacing };
      drawing.setColor(cyan);
      drawText(drawing, "SCORE 001250", x, y - height * 0.065, options);
      drawText(drawing, "gypq, 019.5!", x, y - height * 0.125, options);

      drawing.setIntensity(0.4);
      for (const sample of ["SCORE ", "SCORE 001250"]) {
        const mark = x + measureText(sample, options).width;
        drawing.moveTo(mark, y - height * 0.071);
        drawing.lineTo(mark, y - height * 0.056);
      }
    }
  }
  drawing.endFrame();
}

const canvas = document.querySelector<HTMLCanvasElement>("#screen")!;

const ctx = canvas.getContext("2d")!;

function drawLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);

  // Broad, soft glow.
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.stroke();

  // Bright central beam.
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  ctx.stroke();
}

drawLine(100, 100, 700, 500, "#00ffff");

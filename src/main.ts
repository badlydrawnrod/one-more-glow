import { createCanvasRenderer } from "./canvas-renderer.ts";
import type { Color } from "./graphics.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#screen");
if (!canvas) throw new Error("Missing #screen canvas");

const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas 2D is unavailable");

const display = createCanvasRenderer(context);
const cyan: Color = [0, 0.9, 1];
const amber: Color = [1, 0.55, 0.12];

display.beginFrame();
display.setColor(cyan);
display.moveTo(120, 110);
display.lineTo(680, 110);
display.lineTo(680, 490);
display.lineTo(120, 490);
display.lineTo(120, 110);

display.setColor(amber);
display.setIntensity(0.75);
display.moveTo(400, 190);
display.lineTo(470, 350);
display.lineTo(330, 350);
display.lineTo(400, 190);
display.point(400, 300);

display.setIntensity(1);
display.setColor(cyan);
display.moveTo(260, 300);
display.lineTo(540, 300);
display.endFrame();

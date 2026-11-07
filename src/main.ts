import { createWebGL2Renderer } from "./webgl2-renderer.ts";
import { createCanvasRenderer } from "./canvas-renderer.ts";
import type { Color } from "./graphics.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#screen");
if (!canvas) throw new Error("Missing #screen canvas");

const renderer = new URLSearchParams(location.search).get("renderer");
const display = renderer === "canvas"
  ? createCanvasRenderer(requireContext(canvas.getContext("2d"), "Canvas 2D"))
  : createWebGL2Renderer(requireContext(canvas.getContext("webgl2", { alpha: true }), "WebGL2"));
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

display.setIntensity(0.25);
display.moveTo(100, 420);
display.lineTo(300, 420);
display.point(350, 420);

display.setIntensity(0.6);
display.moveTo(100, 460);
display.lineTo(300, 460);
display.point(350, 460);

display.setIntensity(1);
display.moveTo(100, 500);
display.lineTo(300, 500);
display.point(350, 500);
display.endFrame();

function requireContext<T>(context: T | null, name: string): T {
  if (!context) throw new Error(`${name} is unavailable`);
  return context;
}

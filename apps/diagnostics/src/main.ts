import {
  createWebGL2Renderer,
  drawArc,
  drawCircle,
  drawEllipse,
  drawEllipseArc,
  drawPolygonOutline,
  drawPolyline,
  drawText,
  type Color,
  type DisplayOrientation,
  type DrawingContext,
} from "one-more-glow";
import { drawSegmentStudy, drawSpacingStudy } from "./segment-study.ts";

let screen = requireElement(document.querySelector<HTMLCanvasElement>("#screen"), "#screen");
const menuToggle = requireElement(document.querySelector<HTMLButtonElement>("#menu-toggle"), "#menu-toggle");
const menu = requireElement(document.querySelector<HTMLElement>("#display-menu"), "#display-menu");
const animationControl = requireElement(document.querySelector<HTMLElement>("#animation-control"), "#animation-control");
const animationToggle = requireElement(document.querySelector<HTMLInputElement>("#animation-toggle"), "#animation-toggle");

const params = new URLSearchParams(location.search);
let orientation: DisplayOrientation = params.get("orientation") === "portrait"
  ? "portrait"
  : "landscape";
const requestedScene = params.get("scene");
let scene = requestedScene === "testcard" || requestedScene === "segments" || requestedScene === "spacing"
  ? requestedScene
  : "game";
let animate = params.get("animate") === "1" && scene === "game";
let renderer: DrawingContext;

function aspectRatio(): number {
  return orientation === "landscape" ? 4 / 3 : 3 / 4;
}

function resizeCanvas(): void {
  const ratio = aspectRatio();
  const maxWidth = Math.min(window.innerWidth * 0.96, window.innerHeight * 0.92 * ratio);
  const cssWidth = Math.max(1, Math.min(800, maxWidth));
  const cssHeight = cssWidth / ratio;
  const pixelRatio = window.devicePixelRatio || 1;

  screen.style.width = `${cssWidth}px`;
  screen.style.height = `${cssHeight}px`;
  screen.width = Math.round(cssWidth * pixelRatio);
  screen.height = Math.round(cssHeight * pixelRatio);
}

function createRenderer(canvas: HTMLCanvasElement): DrawingContext {
  return createWebGL2Renderer(
    requireContext(canvas.getContext("webgl2", { alpha: true }), "WebGL2"),
    { orientation },
  );
}

resizeCanvas();
renderer = createRenderer(screen);

const cyan: Color = [0, 0.9, 1];
const amber: Color = [1, 0.55, 0.12];
const magenta: Color = [1, 0, 1];
const green: Color = [0, 1, 0];

function project(x: number, y: number): readonly [number, number] {
  return orientation === "portrait" ? [y, -x] : [x, y];
}

function move(x: number, y: number): void {
  renderer.moveTo(...project(x, y));
}

function line(x: number, y: number): void {
  renderer.lineTo(...project(x, y));
}

function point(x: number, y: number): void {
  renderer.point(...project(x, y));
}

function drawTestCard(): void {
  renderer.beginFrame();
  renderer.pushTransform();
  renderer.translate(...project(0, 115));
  renderer.scale(0.65, 0.65);

  // A dim frame gives the samples a shared boundary without competing with them.
  renderer.setColor(cyan);
  renderer.setIntensity(0.25);
  drawPolygonOutline(renderer, [
    [-470, -330], [470, -330], [470, 330], [-470, 330],
  ].map(([x, y]) => project(x, y)));

  // Open connected paths, stepping down in intensity.
  renderer.setColor(magenta);
  for (const [intensity, y] of [[1, 220], [0.75, 145], [0.5, 70], [0.25, -5]]) {
    renderer.setIntensity(intensity);
    drawPolyline(renderer, [
      [-430, y - 28], [-385, y + 28], [-340, y - 28], [-295, y + 28],
    ].map(([x, py]) => project(x, py)));
  }

  // Closed outlines use the same geometry at matching intensity steps.
  renderer.setColor(green);
  for (const [intensity, y] of [[1, 220], [0.75, 145], [0.5, 70], [0.25, -5]]) {
    renderer.setIntensity(intensity);
    drawPolygonOutline(renderer, [
      [295, y + 28], [430, y + 28], [412, y - 28], [313, y - 28],
    ].map(([x, py]) => project(x, py)));
  }

  // A central beam study: line crossing a closed vector shape and a point.
  renderer.setColor(amber);
  renderer.setIntensity(0.75);
  drawPolygonOutline(renderer, [
    [-78, -72], [0, 108], [78, -72],
  ].map(([x, y]) => project(x, y)));
  renderer.setColor(cyan);
  renderer.setIntensity(1);
  move(-178, 15);
  line(178, 15);
  point(0, 15);

  // A small local-coordinate craft row shows translation, rotation and scaling.
  renderer.setColor(amber);
  for (const [x, angle, size] of [[-150, -25, 0.8], [0, 0, 1], [150, 25, 1.2]]) {
    renderer.pushTransform();
    renderer.translate(...project(x, 205));
    renderer.rotate(angle);
    renderer.scale(size, size);
    drawPolygonOutline(renderer, [
      [0, 30], [-18, -20], [0, -10], [18, -20],
    ]);
    renderer.popTransform();
  }

  // Short line and point samples show three distinct intensity levels.
  renderer.setColor(cyan);
  for (const [intensity, y] of [[0.25, -170], [0.6, -225], [1, -280]]) {
    renderer.setIntensity(intensity);
    move(-430, y);
    line(-270, y);
    point(-238, y);
  }

  renderer.setIntensity(0.75);
  renderer.setColor(amber);
  drawCircle(renderer, project(-75, -215), 43);
  renderer.setColor(green);
  const ellipseRadii: readonly [number, number] = orientation === "portrait" ? [40, 72] : [72, 40];
  drawEllipse(renderer, project(75, -215), ...ellipseRadii);

  // Open arcs contrast with the closed circle and ellipse outlines.
  renderer.setColor(magenta);
  renderer.setIntensity(0.8);
  drawArc(renderer, project(-75, -215), 58, 25, 155);
  renderer.setColor(cyan);
  const arcRadii: readonly [number, number] = orientation === "portrait" ? [52, 86] : [86, 52];
  drawEllipseArc(renderer, project(75, -215), arcRadii[0], arcRadii[1], 205, 335);

  // Nested rectangles make the high-intensity halo response easy to compare.
  renderer.setColor(cyan);
  for (const [intensity, inset] of [[1, 0], [0.75, 16], [0.5, 32], [0.25, 48]]) {
    renderer.setIntensity(intensity);
    drawPolygonOutline(renderer, [
      [210 + inset, -115 - inset],
      [450 - inset, -115 - inset],
      [450 - inset, -310 + inset],
      [210 + inset, -310 + inset],
    ].map(([x, y]) => project(x, y)));
  }

  renderer.popTransform();

  // Keep geometry and colours constant to make the overdrive response visible.
  const intensities = [0.5, 1, 1.25, 1.5, 2];
  intensities.forEach((intensity, index) => {
    const x = -440 + index * 180;
    renderer.setColor([0.75, 0.8, 0.85]);
    renderer.setIntensity(0.8);
    const [labelX, labelY] = project(x, -150);
    drawText(renderer, intensity.toFixed(intensity === 1.25 ? 2 : 1), labelX, labelY, {
      font: "segment16", height: 20,
    });
    for (const [color, y] of [[cyan, -190], [magenta, -260]] as const) {
      renderer.setColor(color);
      renderer.setIntensity(intensity);
      move(x, y);
      line(x + 100, y);
      point(x + 130, y);
    }
  });

  renderer.endFrame();
}

function drawGameScene(shipAngle = -12): void {
  renderer.beginFrame();

  // A sparse, low-intensity arena grid sits behind the action.
  renderer.setColor(cyan);
  renderer.setIntensity(0.07);
  for (let x = -400; x <= 400; x += 100) {
    move(x, -275);
    line(x, 275);
  }
  for (let y = -250; y <= 250; y += 100) {
    move(-450, y);
    line(450, y);
  }

  // Rocky planet surface, with a flat central landing shelf.
  renderer.setColor(green);
  renderer.setIntensity(0.8);
  drawPolyline(renderer, [
    [-470, -188], [-410, -215], [-350, -205], [-285, -246],
    [-215, -236], [-160, -272], [-90, -272], [-42, -248],
    [42, -248], [90, -272], [160, -272], [215, -236],
    [285, -246], [350, -205], [410, -215], [470, -188],
  ].map(([x, y]) => project(x, y)));

  // Thrust-style craft and its exhaust.
  renderer.setColor(cyan);
  renderer.setIntensity(1);
  renderer.pushTransform();
  renderer.translate(...project(0, 130));
  renderer.rotate(shipAngle);
  drawPolygonOutline(renderer, [
    [0, 34], [-19, -11], [-10, -5], [-10, -36],
    [10, -36], [10, -5], [19, -11],
  ]);
  renderer.setColor(amber);
  renderer.setIntensity(0.85);
  drawPolyline(renderer, [[-7, -42], [0, -73], [7, -42]]);
  point(0, -73);
  renderer.popTransform();

  // Tractor beam links the craft to a fuel pod above the surface.
  renderer.setColor(cyan);
  renderer.setIntensity(0.45);
  move(-5, 92);
  line(-5, -112);
  move(5, 92);
  line(5, -112);
  renderer.setColor(amber);
  renderer.setIntensity(0.9);
  drawPolygonOutline(renderer, [
    [0, -93], [18, -112], [0, -145], [-18, -112],
  ].map(([x, y]) => project(x, y)));
  renderer.setColor(cyan);
  point(0, -112);

  // Geometric enemies and a shield-like orbit add a second arcade vocabulary.
  renderer.setColor(magenta);
  renderer.setIntensity(0.7);
  drawPolygonOutline(renderer, [
    [-255, 122], [-232, 145], [-209, 122], [-232, 99],
  ].map(([x, y]) => project(x, y)));
  drawCircle(renderer, project(-232, 122), 36);
  renderer.setColor(cyan);
  renderer.setIntensity(0.45);
  drawArc(renderer, project(-232, 122), 54, 205, 335);

  renderer.setColor(green);
  renderer.setIntensity(0.85);
  drawPolygonOutline(renderer, [
    [226, 160], [258, 140], [274, 108], [258, 76],
    [226, 56], [194, 76], [178, 108], [194, 140],
  ].map(([x, y]) => project(x, y)));
  renderer.setColor(cyan);
  renderer.setIntensity(0.45);
  drawEllipse(renderer, project(226, 108), 56, 72);
  renderer.setColor(amber);
  renderer.setIntensity(0.55);
  drawEllipseArc(renderer, project(226, 108), 78, 96, 25, 155);

  // A few bright shots connect the action without suggesting animation.
  renderer.setColor(amber);
  renderer.setIntensity(1);
  move(-152, 78);
  line(-92, 98);
  point(-78, 103);
  move(105, 73);
  line(157, 92);
  point(170, 97);
  renderer.setColor(magenta);
  renderer.setIntensity(0.65);
  move(184, 63);
  line(143, 28);
  point(132, 18);

  // Small stars keep the dark gaps from feeling like unused test-card space.
  renderer.setColor(cyan);
  renderer.setIntensity(0.45);
  for (const [x, y] of [
    [-350, 190], [-125, 225], [90, 210], [355, 205],
    [-365, 15], [-300, -85], [330, -35], [370, -112],
  ]) point(x, y);

  renderer.endFrame();
}

function drawDiagnostic(): void {
  if (scene === "testcard") drawTestCard();
  else if (scene === "segments") drawSegmentStudy(renderer, orientation === "portrait");
  else if (scene === "spacing") drawSpacingStudy(renderer, orientation === "portrait");
  else drawGameScene();
}

let animationFrame: number | undefined;

function stopAnimation(): void {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  animationFrame = undefined;
}

function animateGame(time: number): void {
  if (!animate || scene !== "game") return;
  drawGameScene((time * 0.03) % 360);
  animationFrame = requestAnimationFrame(animateGame);
}

function renderCurrentScene(): void {
  stopAnimation();
  if (animate && scene === "game") {
    animationFrame = requestAnimationFrame(animateGame);
  } else {
    drawDiagnostic();
  }
}

function syncControls(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-scene]")) {
    button.setAttribute("aria-pressed", String(button.dataset.scene === scene));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-orientation]")) {
    button.setAttribute("aria-pressed", String(button.dataset.orientation === orientation));
  }
  animationControl.hidden = scene !== "game";
  animationToggle.checked = animate;
}

function setMenuOpen(open: boolean): void {
  menu.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
  const label = menuToggle.querySelector<HTMLElement>(".visually-hidden");
  if (label) label.textContent = open ? "Close display menu" : "Open display menu";
}

function closeMenu(): void {
  setMenuOpen(false);
  menuToggle.focus();
}

menuToggle.addEventListener("click", () => setMenuOpen(menu.hasAttribute("hidden")));
menu.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const selectedScene = target.dataset.scene;
  if (selectedScene === "game" || selectedScene === "testcard" || selectedScene === "segments" || selectedScene === "spacing") {
    scene = selectedScene;
    if (scene !== "game") animate = false;
    syncControls();
    renderCurrentScene();
    closeMenu();
    return;
  }

  const selectedOrientation = target.dataset.orientation;
  if (selectedOrientation === "landscape" || selectedOrientation === "portrait") {
    if (orientation !== selectedOrientation) {
      orientation = selectedOrientation;
      stopAnimation();
      const replacement = document.createElement("canvas");
      replacement.id = "screen";
      replacement.setAttribute("aria-label", "Rendering diagnostic display");
      screen.replaceWith(replacement);
      screen = replacement;
      resizeCanvas();
      renderer = createRenderer(screen);
      renderCurrentScene();
    }
    syncControls();
    closeMenu();
  }
});

animationToggle.addEventListener("change", () => {
  animate = animationToggle.checked && scene === "game";
  syncControls();
  renderCurrentScene();
});

window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape" && !menu.hidden) {
    closeMenu();
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
  if (!animate) drawDiagnostic();
});

syncControls();
renderCurrentScene();

function requireContext<T>(context: T | null, name: string): T {
  if (!context) throw new Error(`${name} is unavailable`);
  return context;
}

function requireElement<T extends Element>(element: T | null, name: string): T {
  if (!element) throw new Error(`Missing ${name}`);
  return element;
}

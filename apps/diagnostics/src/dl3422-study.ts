import type { DrawingContext } from "one-more-glow";

// Line-centre adaptation of ThreeFourTwoTwo by Stewart C. Russell, based on
// the DL-3422 chart. See THREEFOURTWOTWO-OFL.txt for copyright and licence.
// Elements are in a unit cell; the baseline is 0 and descenders extend below.
type Element = readonly [number, number] | readonly [number, number, number, number];
const elements: readonly Element[] = [
  [0.5, 1, 0.5, 0.5], [0.41, -0.09],
  [0, 1, 0, 0.5], [0, 0, 0.5, 0], [0.5, 0, 1, 0],
  [0.5, 0.5, 0.5, 0], [0.5, 0.5, 1, 0.5], [0, 0.5, 0.5, 0.5],
  [0.5, 0, 0.5, -0.35], [1, 0.5, 1, 0],
  [0.5, 1, 1, 1], [0, 1, 0.5, 1],
  [0, 0, 0.5, 0.5], [0.5, 0.5, 1, 1], [0.5, 0.5, 1, 0],
  [0, 0.5, 0, 0], [0, 1, 0.5, 0.5], [0.4, 0.92],
  [1, 1, 1, 0.5], [0.5, -0.35, 1, -0.35], [0, -0.35, 0.5, -0.35],
  [0, 0.5, 0.25, 0.25], [0.25, 0.25, 0.5, 0],
];

// Printable ASCII, in code-point order from space through tilde. Each letter
// identifies an element above; the source font leaves space empty.
const masks: readonly string[] = [
  "", //  32  
  "ab", //  33 !
  "ca", //  34 "
  "deafghi", //  35 #
  "dejcklafghi", //  36 $
  "mnejclafgh", //  37 %
  "odejcplah", //  38 &
  "n", //  39 '
  "dcpl", //  40 (
  "dlaf", //  41 )
  "monqafgh", //  42 *
  "afgh", //  43 +
  "bi", //  44 ,
  "gh", //  45 -
  "b", //  46 .
  "mn", //  47 /
  "dcplaf", //  48 0
  "af", //  49 1
  "dplah", //  50 2
  "dlafh", //  51 3
  "cafh", //  52 4
  "dclfh", //  53 5
  "dcplfh", //  54 6
  "laf", //  55 7
  "dcplafh", //  56 8
  "clafh", //  57 9
  "rb", //  58 :
  "rbi", //  59 ;
  "md", //  60 <
  "degh", //  61 =
  "oe", //  62 >
  "sklfgb", //  63 ?
  "desjpklfh", //  64 @
  "sjcpklgh", //  65 A
  "desjklafg", //  66 B
  "decpkl", //  67 C
  "desjklaf", //  68 D
  "decpklh", //  69 E
  "cpklh", //  70 F
  "dejcpklg", //  71 G
  "sjcpgh", //  72 H
  "deklaf", //  73 I
  "dpaf", //  74 J
  "oncph", //  75 K
  "decp", //  76 L
  "nqsjcp", //  77 M
  "oqsjcp", //  78 N
  "desjcpkl", //  79 O
  "scpklgh", //  80 P
  "odesjcpkl", //  81 Q
  "oscpklgh", //  82 R
  "dejcklgh", //  83 S
  "klaf", //  84 T
  "desjcp", //  85 U
  "mncp", //  86 V
  "mosjcp", //  87 W
  "monq", //  88 X
  "nqf", //  89 Y
  "mndekl", //  90 Z
  "kafit", //  91 [
  "oq", //  92 backslash
  "lafiu", //  93 ]
  "mo", //  94 ^
  "de", //  95 _
  "q", //  96 `
  "mdfh", //  97 a
  "dcpfh", //  98 b
  "dph", //  99 c
  "dpafh", // 100 d
  "mdph", // 101 e
  "kafgh", // 102 f
  "dpfhiu", // 103 g
  "cpfh", // 104 h
  "fr", // 105 i
  "friu", // 106 j
  "cphvw", // 107 k
  "af", // 108 l
  "jpfgh", // 109 m
  "pfvw", // 110 n
  "dpfh", // 111 o
  "ejfgi", // 112 p
  "dpfhit", // 113 q
  "ph", // 114 r
  "dhvw", // 115 s
  "eafgh", // 116 t
  "dpf", // 117 u
  "mp", // 118 v
  "dejpf", // 119 w
  "mvw", // 120 x
  "dpfiu", // 121 y
  "mdh", // 122 z
  "kafhit", // 123 {
  "afi", // 124 |
  "lafgiu", // 125 }
  "ejpfh", // 126 ~
];

/** Draw the experimental reference shapes using normal vector operations. */
export function drawDLText(
  drawing: DrawingContext,
  text: string,
  x: number,
  baseline: number,
  height: number,
): void {
  const width = height * 0.58;
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    for (const name of masks[code - 32] ?? "") {
      const element = elements[name.charCodeAt(0) - 97];
      if (element.length === 2) {
        drawing.point(x + element[0] * width, baseline + element[1] * height);
      } else {
        drawing.moveTo(x + element[0] * width, baseline + element[1] * height);
        drawing.lineTo(x + element[2] * width, baseline + element[3] * height);
      }
    }
    x += height * 0.82;
  }
}

// Experimental proportional spacing and pair adjustments for the pangram.
// These are local to the diagnostic, not a proposed public text API.
export function drawDLKernedText(
  drawing: DrawingContext,
  text: string,
  centerX: number,
  baseline: number,
  height: number,
): void {
  const pairAdjustments: Record<string, number> = { Th: -0.05, fo: -0.04, ov: -0.03 };
  const placements: Array<{ character: string; x: number }> = [];
  let advance = 0;
  let previous = "";

  for (const character of text) {
    const mask = masks[(character.codePointAt(0) ?? 0) - 32] ?? "";
    if (!mask) {
      advance += height * 0.32;
      previous = "";
      continue;
    }

    let left = Infinity;
    let right = -Infinity;
    for (const name of mask) {
      const element = elements[name.charCodeAt(0) - 97];
      left = Math.min(left, element[0]);
      right = Math.max(right, element[0]);
      if (element.length === 4) {
        left = Math.min(left, element[2]);
        right = Math.max(right, element[2]);
      }
    }
    advance += (pairAdjustments[previous + character] ?? 0) * height;
    placements.push({ character, x: advance - left * height * 0.58 });
    advance += (right - left) * height * 0.58 + height * 0.16;
    previous = character;
  }

  const origin = centerX - (advance - height * 0.16) / 2;
  for (const placement of placements) {
    drawDLText(drawing, placement.character, origin + placement.x, baseline, height);
  }
}

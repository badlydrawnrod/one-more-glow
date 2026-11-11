// Line-centre adaptation of ThreeFourTwoTwo by Stewart C. Russell.
// See THREEFOURTWOTWO-OFL.txt for the copyright and licence.
export type Element = readonly [number, number] | readonly [number, number, number, number];
export const elements22: readonly Element[] = [
  [0.5, 1, 0.5, 0.5], [0.41, -0.09],
  [0, 1, 0, 0.5], [0, 0, 0.5, 0], [0.5, 0, 1, 0],
  [0.5, 0.5, 0.5, 0], [0.5, 0.5, 1, 0.5], [0, 0.5, 0.5, 0.5],
  [0.5, 0, 0.5, -0.35], [1, 0.5, 1, 0],
  [0.5, 1, 1, 1], [0, 1, 0.5, 1],
  [0, 0, 0.5, 0.5], [0.5, 0.5, 1, 1], [0.5, 0.5, 1, 0],
  [0, 0.5, 0, 0], [0, 1, 0.5, 0.5], [0.4, 0.92],
  [1, 1, 1, 0.5], [0.5, -0.35, 1, -0.35], [0, -0.35, 0.5, -0.35],
  [0, 0.5, 0.25, 0.25], [0.25, 0.25, 0.5, 0],
  // Colon dots sit within the uppercase height, away from ascenders and descenders.
  [0.5, 0.7], [0.5, 0.25],
];

// Chamfered capitals retain the font's proportions while distinguishing
// their left-hand stems and lobes from the centre-stem display forms.
export const overrides22: Readonly<Record<string, readonly Element[]>> = {
  B: [[0, 0, 0, 1], [0, 1, 0.7, 1], [0.7, 1, 1, 0.75],
    [1, 0.75, 0.7, 0.5], [0.7, 0.5, 0, 0.5],
    [0.7, 0.5, 1, 0.25], [1, 0.25, 0.7, 0], [0.7, 0, 0, 0]],
  D: [[0, 0, 0, 1], [0, 1, 0.7, 1], [0.7, 1, 1, 0.75],
    [1, 0.75, 1, 0.25], [1, 0.25, 0.7, 0], [0.7, 0, 0, 0]],
};

// Printable ASCII, in code-point order from space through tilde. Each letter
// identifies an element above; the source font leaves space empty.
export const masks22: readonly string[] = [
  "", //  32 space
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
  "xy", //  58 :
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


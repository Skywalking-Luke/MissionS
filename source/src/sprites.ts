// Top-down 12x20 pixel car sprites (front = top). Design cues only, no logos or wordmarks.
export const SW = 12, SH = 20;
export type Sprite = { cv: HTMLCanvasElement; tag: string };
type P = (c: string, x: number, y: number, w?: number, h?: number) => void;
function make(tag: string, draw: (p: P) => void): Sprite {
  const cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
  const g = cv.getContext("2d")!;
  const p: P = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  draw(p); return { cv, tag };
}
const TYRE = "#0b0b0d";
function hull(p: P, c: string, prof: number[], tyres = [3, 13]) {
  for (const ty of tyres) { p(TYRE, 0, ty, 1, 4); p(TYRE, 11, ty, 1, 4); }
  prof.forEach((h, y) => { if (h > 0) p(c, 6 - h, y, 2 * h, 1); });
}
const TORP = [3, 4, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 4];
const WEDGE = [2, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
const SMOOTH = [3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4];

// Mission S show car: Firn white, light red wraparound line, black chrome, round lights,
// torpedo fenders, forward cabin + flyline, rear radiator fan (917 homage), integrated active wing, blade lights.
export const PLAYER = make("mission-s", (p) => {
  hull(p, "#eef0f2", TORP);
  for (let y = 8; y < 12; y++) { p("#cdd2d8", 2, y); p("#cdd2d8", 9, y); }
  for (let y = 2; y < 18; y++) { const h = TORP[y]; p("#d8343c", 6 - h, y); p("#d8343c", 5 + h, y); }
  p("#f6fbff", 3, 0, 6, 1);                       // front aero-blade light
  p("#fff6c8", 2, 2, 2, 2); p("#fff6c8", 8, 2, 2, 2); // round headlights
  p("#1b2230", 4, 5, 4, 1); p("#1b2230", 3, 6, 6, 3); p("#1b2230", 4, 9, 4, 1); p("#4a5d7a", 4, 6, 2, 1); // canopy
  p("#d3d8de", 5, 10, 2, 2);                      // flyline spine
  p("#2a2d33", 4, 12, 4, 4); p("#9aa0a8", 5, 13, 2, 2); p("#2a2d33", 5, 13); p("#2a2d33", 6, 14); // fan wheel
  p("#eef0f2", 4, 12); p("#eef0f2", 7, 12); p("#eef0f2", 4, 15); p("#eef0f2", 7, 15);
  p("#2a2d33", 1, 17, 10, 1);                     // integrated wing
  p("#e8202e", 1, 19, 10, 1);                     // rear blade light
});

export const BOTS: Sprite[] = [
  make("horseshoe", (p) => { // two-tone, horseshoe grille, C-line
    hull(p, "#1f3c8a", SMOOTH); p("#121318", 1, 0, 10, 9); p("#121318", 2, 0, 8, 1);
    p("#c8ccd2", 4, 0, 1, 3); p("#c8ccd2", 7, 0, 1, 3); p("#c8ccd2", 5, 2, 2, 1);
    p("#c8ccd2", 1, 8, 1, 4); p("#c8ccd2", 10, 8, 1, 4);
    p("#0a0d14", 4, 6, 4, 4); p("#3a4f7a", 4, 6, 2, 1); p("#ff2a2a", 2, 19, 8, 1);
  }),
  make("big-wing", (p) => { // huge boomerang wing
    hull(p, "#ff6a1a", WEDGE); p("#111", 2, 0, 8, 1); p("#1a1a1a", 4, 5, 4, 4); p("#444", 4, 5, 2, 1);
    p("#111", 3, 11, 1, 4); p("#111", 8, 11, 1, 4);
    p("#111", 0, 16, 12, 2); p("#111", 0, 15, 1, 4); p("#111", 11, 15, 1, 4); p("#ff2a2a", 2, 19, 8, 1);
  }),
  make("light-bar", (p) => { // smooth EV, full-width light bars
    hull(p, "#5a7d9a", SMOOTH); p("#e8f4ff", 2, 1, 8, 1); p("#11161c", 3, 6, 6, 4); p("#3b5168", 3, 6, 3, 1);
    p("#47667f", 5, 11, 2, 5); p("#ff2a2a", 2, 18, 8, 1);
  }),
  make("long-tail", (p) => { // papaya, teardrop canopy, long tail
    hull(p, "#ff8a00", [2, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 3]);
    p("#111", 4, 4, 4, 1); p("#111", 3, 5, 6, 3); p("#111", 4, 8, 4, 2); p("#111", 5, 10, 2, 1); p("#333", 4, 5, 2, 1);
    p("#111", 2, 17, 8, 1); p("#ff2a2a", 3, 19, 6, 1);
  }),
  make("visor", (p) => { // rosso, black visor band
    hull(p, "#d40000", WEDGE); p("#111", 2, 0, 8, 1); p("#111", 1, 4, 10, 5); p("#3a3a44", 4, 5, 3, 1);
    p("#111", 4, 12, 4, 3); p("#ff4a3a", 1, 19, 3, 1); p("#ff4a3a", 8, 19, 3, 1);
  }),
  make("y-lights", (p) => { // verde, Y lights, hexagon engine bay
    hull(p, "#6cc82a", WEDGE); p("#fff", 2, 1); p("#fff", 3, 2, 1, 2); p("#fff", 4, 1); p("#fff", 7, 1); p("#fff", 8, 2, 1, 2); p("#fff", 9, 1);
    p("#111", 4, 5, 4, 4); p("#111", 4, 12, 4, 4); p("#6cc82a", 4, 12); p("#6cc82a", 7, 12); p("#6cc82a", 4, 15); p("#6cc82a", 7, 15);
    p("#ff2a2a", 1, 18, 2, 1); p("#ff2a2a", 9, 18, 2, 1); p("#ff2a2a", 2, 19, 8, 1);
  }),
  make("roof-scoop", (p) => { // silver, roof scoop, shark fin, big wing
    hull(p, "#a7b0b8", SMOOTH); p("#222", 2, 0, 8, 2); p("#15181c", 3, 5, 6, 4); p("#111", 5, 9, 2, 2);
    p("#4a525a", 6, 11, 1, 6); p("#111", 0, 17, 12, 1); p("#ff2a2a", 2, 19, 8, 1);
  }),
  make("teardrop-pod", (p) => { // separated fenders, teardrop pod, fins
    hull(p, "#0f5a3c", TORP); for (let y = 4; y < 15; y++) { p("#050505", 3, y); p("#050505", 8, y); }
    p("#0b0b0b", 4, 3, 4, 1); p("#0b0b0b", 4, 4, 4, 6); p("#2a3a34", 4, 5, 2, 1); p("#0f5a3c", 4, 10, 4, 5);
    p("#b7ff3a", 5, 11, 2, 5); p("#b7ff3a", 1, 1, 2, 1); p("#b7ff3a", 9, 1, 2, 1); p("#ff2a2a", 1, 19, 10, 1);
  }),
  make("quad-exhaust", (p) => { // blue, ducktail, quad pipes
    hull(p, "#2c5fa8", SMOOTH); p("#fff", 2, 2, 2, 1); p("#fff", 8, 2, 2, 1); p("#0e1a2e", 3, 6, 6, 4); p("#3e6aa8", 3, 6, 3, 1);
    p("#c9a54a", 5, 12, 2, 3); p("#1a2a44", 1, 17, 10, 1); p("#cfd3d8", 4, 18, 2, 2); p("#cfd3d8", 6, 18, 2, 2); p("#555", 5, 19); p("#555", 6, 19);
  }),
  make("rear-fan", (p) => { // central seat, big rear fan
    hull(p, "#e6e6e6", SMOOTH); p("#2b6fd6", 5, 0, 2, 12); p("#111", 4, 5, 4, 4); p("#333", 5, 6, 2, 1);
    p("#151515", 3, 12, 6, 6); p("#888", 5, 14, 2, 2); p("#151515", 5, 14); p("#151515", 6, 15); p("#e6e6e6", 3, 12); p("#e6e6e6", 8, 12); p("#e6e6e6", 3, 17); p("#e6e6e6", 8, 17);
    p("#ff2a2a", 2, 19, 8, 1);
  }),
  make("tandem", (p) => { // matte black, gold stripes, tandem seats
    hull(p, "#26272b", WEDGE); p("#d4a63a", 2, 1, 1, 17); p("#d4a63a", 9, 1, 1, 17);
    p("#0c0c0e", 5, 3, 2, 10); p("#55555e", 5, 4, 1, 2); p("#55555e", 5, 9, 1, 2); p("#d4a63a", 0, 18, 12, 1); p("#ff2a2a", 3, 19, 6, 1);
  }),
  make("hood-vents", (p) => { // yellow, black hood vents
    hull(p, "#ffd400", WEDGE); p("#111", 3, 1, 2, 3); p("#111", 7, 1, 2, 3); p("#111", 3, 6, 6, 4); p("#444", 3, 6, 3, 1);
    p("#111", 3, 12, 6, 1); p("#111", 3, 14, 6, 1); p("#111", 2, 17, 8, 1); p("#ff2a2a", 2, 19, 8, 1);
  }),
  make("venturi", (p) => { // dark grey, see-through venturi tunnels, ribbon tail
    hull(p, "#3a3f47", SMOOTH); p("#ffd23f", 2, 1, 8, 1); p("#14171c", 3, 5, 6, 5); p("#444c58", 3, 5, 3, 1);
    p("#46484c", 2, 13, 2, 5); p("#46484c", 8, 13, 2, 5); p("#ff2a2a", 1, 19, 10, 1);
  }),
];

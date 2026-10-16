import "./style.css";

// ---------- setup ----------
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const cv = $<HTMLCanvasElement>("c");
const ctx = cv.getContext("2d")!;
const params = new URLSearchParams(location.search);
const OG = params.has("og");
const W = OG ? 240 : 180;
let H = 320;
const PX_PER_M = 10;

function resize() {
  const vw = innerWidth, vh = innerHeight;
  if (OG) { H = 126; } else H = Math.max(300, Math.min(400, Math.round((W * vh) / vw)));
  cv.width = W; cv.height = H;
  const s = Math.min(vw / W, vh / H);
  cv.style.width = Math.floor(W * s) + "px";
  cv.style.height = Math.floor(H * s) + "px";
  ctx.imageSmoothingEnabled = false;
}
addEventListener("resize", resize);
resize();

// no zoom guards
document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false } as AddEventListenerOptions);
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
  const t = Date.now();
  if (t - lastTouchEnd < 350 && !(e.target as HTMLElement).closest("input,#menu button")) e.preventDefault();
  lastTouchEnd = t;
}, { passive: false });
document.addEventListener("touchmove", (e) => { if ((e as TouchEvent).touches.length > 1) e.preventDefault(); }, { passive: false });

// ---------- helpers ----------
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
function hash(n: number) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const fmtT = (t: number) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, "0")}`; };

// ---------- track: full Nordschleife lap ----------
// [name, km length, direction (-1 left / +1 right / 0 wiggle), intensity 0..1, width scale, wiggle count]
const RAW: [string, number, number, number, number, number][] = [
  ["T13 · START", 0.5, 0, 0.1, 1, 0], ["HATZENBACH", 1.3, 0, 0.7, 0.85, 4], ["HOCHEICHEN", 0.6, 1, 0.6, 0.9, 0],
  ["QUIDDELBACHER HÖHE", 0.8, -1, 0.35, 1, 0], ["FLUGPLATZ", 0.7, 1, 0.55, 1, 0], ["SCHWEDENKREUZ", 1.0, -1, 0.5, 1, 0],
  ["AREMBERG", 0.6, 1, 0.95, 0.9, 0], ["FUCHSRÖHRE", 0.9, 0, 0.55, 0.95, 2], ["ADENAUER FORST", 0.6, 0, 0.9, 0.72, 2],
  ["METZGESFELD", 0.9, -1, 0.5, 0.95, 0], ["KALLENHARD", 0.6, 1, 0.7, 0.9, 0], ["WEHRSEIFEN", 0.6, -1, 0.9, 0.78, 0],
  ["BREIDSCHEID", 0.7, 1, 0.8, 0.9, 0], ["EX-MÜHLE", 0.5, -1, 0.7, 0.85, 0], ["BERGWERK", 0.8, 1, 0.85, 0.9, 0],
  ["KESSELCHEN", 1.4, -1, 0.35, 1, 0], ["KLOSTERTAL", 0.7, 1, 0.75, 0.9, 0], ["KARUSSELL", 0.5, -1, 1.0, 0.85, 0],
  ["HOHE ACHT", 0.8, 1, 0.6, 0.85, 0], ["WIPPERMANN", 0.7, 0, 0.6, 0.8, 3], ["ESCHBACH", 0.5, -1, 0.65, 0.85, 0],
  ["BRÜNNCHEN", 0.7, 1, 0.7, 0.85, 0], ["EISKURVE", 0.5, -1, 0.6, 0.85, 0], ["PFLANZGARTEN", 0.9, 1, 0.6, 0.85, 0],
  ["STEFAN BELLOF S", 0.5, 0, 0.8, 0.8, 2], ["SCHWALBENSCHWANZ", 0.7, 1, 0.85, 0.85, 0], ["GALGENKOPF", 0.6, -1, 0.6, 0.95, 0],
  ["DÖTTINGER HÖHE", 2.2, 0, 0.05, 1.05, 0], ["ANTONIUSBUCHE", 0.8, 1, 0.2, 0.95, 0],
];
const LAP_KM = 20.8, LAP_PX = 19000; // ~3m20s at lap-1 cruising speed
const rawKm = RAW.reduce((a, r) => a + r[1], 0);
type Sec = { name: string; s0: number; len: number; dir: number; k: number; w: number; wig: number; km0: number };
const SECS: Sec[] = [];
{ let acc = 0; for (const r of RAW) { const len = (r[1] / rawKm) * LAP_PX; SECS.push({ name: r[0], s0: acc, len, dir: r[2], k: r[3], w: r[4], wig: r[5], km0: (acc / LAP_PX) * LAP_KM }); acc += len; } }
const lapPos = (s: number) => ((s % LAP_PX) + LAP_PX) % LAP_PX;
function secAt(s: number) { const q = lapPos(s); let lo = 0; for (let i = 0; i < SECS.length; i++) if (SECS[i].s0 <= q) lo = i; return SECS[lo]; }
const sectionAt = (s: number) => secAt(s).name;
const kmAt = (s: number) => (lapPos(s) / LAP_PX) * LAP_KM;
const sectorAt = (s: number) => Math.min(2, Math.floor((lapPos(s) / LAP_PX) * 3));
function center(s: number) {
  const q = lapPos(s), sc = secAt(s), t = (q - sc.s0) / sc.len;
  let c = 5 * Math.sin(s / 260);
  if (sc.wig) c += 34 * sc.k * Math.sin(t * Math.PI * sc.wig) * Math.sin(t * Math.PI);
  else c += sc.dir * 70 * sc.k * Math.sin(t * Math.PI) * (sc.k > 0.8 ? 1 : 0.9);
  return c;
}
function width(s: number) {
  const q = lapPos(s), sc = secAt(s), t = (q - sc.s0) / sc.len;
  const e = Math.min(1, Math.min(t, 1 - t) * 6); // blend toward 1.0 at section edges
  return 82 * (1 + (sc.w - 1) * e);
}

// ---------- state ----------
type Bot = { s: number; off: number; tOff: number; ratio: number; base: number; kind: number; t: number; brake: number; passed: boolean; gap: number; col: string };
type Pick = { s: number; off: number; type: "R" | "T"; got: boolean };
type Part = { x: number; y: number; vx: number; vy: number; life: number; c: string };
type St = "title" | "play" | "pause" | "clear" | "over" | "board";
let st: St = "title";
let level = 1, pS = 0, px = 0, camX = 0, speed = 0, score = 0, runT = 0, levelStart = 0, levelLen = 0;
let bots: Bot[] = [], picks: Pick[] = [], parts: Part[] = [];
let combo = 0, comboT = 0, boosts = 0, nextBoostAt = 3000, boostT = 0, regenT = 0, tvT = 0;
let curSection = "", clearT = 0, crashT = 0, steerIn = 0, lastClearBonus = 0;
let br = { dist: 0, over: 0, near: 0, pick: 0, clear: 0, nOver: 0, nNear: 0 };
const PLAYER_Y = () => Math.round(H * 0.74);
const baseSpeed = (L: number) => 95 * Math.pow(1.25, Math.min(L, 7) - 1);
const levelLength = (_L: number) => LAP_PX;
const botCount = (L: number) => 24 + 10 * (L - 1);
let lapStartT = 0, bestLap = 0, splits: number[] = [], lastSector = 0;
const BOT_COLS = ["#d23b3b", "#f0c419", "#3b7bd2", "#e8e8e8", "#38a84a", "#ff7a1a", "#9b4fd2", "#222"];

function startLevel() {
  levelStart = pS; levelLen = levelLength(level); lapStartT = runT; splits = []; lastSector = 0;
  bots = []; picks = [];
  const n = botCount(level);
  // density ramps through the lap: sector weights 0.6 / 1.0 / 1.4
  const cum = (u: number) => (u < 1 / 3 ? 0.6 * u : u < 2 / 3 ? 0.2 + (u - 1 / 3) : 0.5333 + 1.4 * (u - 2 / 3)) / 1.0;
  const inv = (v: number) => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (cum(m) < v) lo = m; else hi = m; } return lo; };
  for (let i = 0; i < n; i++) {
    const u = inv(((i + rnd(0.15, 0.85)) / n) * 1.0);
    const s = levelStart + 300 + u * (levelLen - 500);
    const sector = Math.floor(u * 3), smart = Math.min(4, level + sector);
    const kind = smart <= 1 ? (Math.random() < 0.3 ? 1 : 0) : Math.floor(rnd(0, Math.min(4, smart)));
    const off = rnd(-0.6, 0.6);
    bots.push({ s, off, tOff: off, ratio: rnd(0.42, 0.62) + Math.min(0.12, 0.03 * (level - 1)), base: 0, kind, t: rnd(0, 3), brake: 0, passed: false, gap: 99, col: BOT_COLS[i % BOT_COLS.length] });
  }
  const np = 6 + level;
  for (let i = 0; i < np; i++) picks.push({ s: levelStart + ((i + rnd(0.2, 0.8)) / np) * levelLen, off: rnd(-0.5, 0.5), type: i % 2 ? "T" : "R", got: false });
  showBanner(`LAP ${level}`, `Nordschleife 20.8 km · ${n} bots`);
}
function newRun() {
  level = 1; pS = 0; bestLap = 0; px = center(0); camX = px; speed = 0; score = 0; runT = 0;
  combo = 0; comboT = 0; boosts = 0; nextBoostAt = 3000; boostT = 0; regenT = 0; tvT = 0; parts = [];
  br = { dist: 0, over: 0, near: 0, pick: 0, clear: 0, nOver: 0, nNear: 0 };
  curSection = "";
  startLevel();
  st = "play"; menu.classList.add("off"); showPlay(true); audio.start();
}

// ---------- UI ----------
const menu = $("menu"), hud = $("hud"), pads = $("pads"), banner = $("banner"), pop = $("pop");
const bboost = $<HTMLButtonElement>("bboost");
let bannerTO = 0, popTO = 0;
function showBanner(t: string, sub = "") {
  banner.innerHTML = t + (sub ? `<small>${sub}</small>` : ""); banner.style.opacity = "1";
  clearTimeout(bannerTO); bannerTO = window.setTimeout(() => (banner.style.opacity = "0"), 1800);
}
function popText(t: string) { pop.textContent = t; clearTimeout(popTO); popTO = window.setTimeout(() => (pop.textContent = ""), 900); }
function showPlay(on: boolean) { hud.classList.toggle("hidden", !on); pads.classList.toggle("hidden", !on); }
function updHud() {
  $("score").textContent = String(Math.floor(score));
  $("lvl").textContent = `LAP ${level}`;
  $("time").textContent = fmtT(runT);
  $("combo").textContent = combo > 1 ? `NEAR x${Math.min(combo, 5)}` : "";
  ($("prog").firstElementChild as HTMLElement).style.width = clamp(((pS - levelStart) / levelLen) * 100, 0, 100) + "%";
  const lt = runT - lapStartT, cur = Math.min(2, Math.floor(((pS - levelStart) / levelLen) * 3));
  $("km").textContent = `${kmAt(pS).toFixed(1)}/20.8 KM`;
  $("spl").textContent = [0, 1, 2].map((i) => i < splits.length ? `S${i + 1} ${fmtT(splits[i] - (i ? splits[i - 1] : 0))}` : i === cur ? `S${i + 1} ${fmtT(lt - (i ? splits[i - 1] : 0))}` : `S${i + 1} -`).join(" ") + (bestLap ? ` · BEST ${fmtT(bestLap)}` : "");
  drawMap();
  const fx: string[] = [];
  if (boostT > 0) fx.push("⚡ E-BOOST");
  if (regenT > 0) fx.push("REGEN");
  if (tvT > 0) fx.push("TORQUE VECTORING " + tvT.toFixed(1));
  $("fx").innerHTML = fx.join("<br>");
  $("pips").textContent = "■".repeat(boosts) + "□".repeat(3 - boosts);
  bboost.disabled = boosts === 0 || boostT > 0;
}

type Entry = { n: string; p: number; t: number; l: number; d: number; b?: number };
const KEY = "missions.board.v1";
const board = (): Entry[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const sortB = (b: Entry[]) => b.sort((a, c) => c.p - a.p || a.t - c.t).slice(0, 10);
function qualifies(p: number) { const b = board(); return p > 0 && (b.length < 10 || p > b[b.length - 1].p || (p === b[b.length - 1].p && runT < b[b.length - 1].t)); }
let lastEntry: Entry | null = null;
function boardHtml() {
  const b = board();
  if (!b.length) return `<p>No runs yet. Be the first.</p>`;
  return `<table><tr><th>#</th><th>NAME</th><th>LAP</th><th class="r">BEST</th><th class="r">TIME</th><th class="r">PTS</th></tr>${b
    .map((e, i) => `<tr class="${lastEntry && e.d === lastEntry.d ? "me" : ""}"><td>${i + 1}</td><td>${e.n}</td><td>${e.l}</td><td class="r">${e.b ? fmtT(e.b) : "-"}</td><td class="r">${fmtT(e.t)}</td><td class="r">${e.p}</td></tr>`).join("")}</table>`;
}
function showTitle() {
  st = "title"; showPlay(false); menu.classList.remove("off");
  menu.innerHTML = `<div class="card"><h2>LH CARS PRESENTS</h2><h1>MISSION S</h1>
  <p>A mid-engined super sports car. One lap = the full 20.8 km Nordschleife.</p>
  <p class="feat">⚡ E-BOOST hybrid overboost · REGEN braking · TORQUE VECTORING</p>
  <p>◀ ▶ steer (tap/hold left or right half, arrows or A/D)<br>Dodge the bots. Grass slows you. Contact ends the run.<br>Space/Shift: E-BOOST · Esc pause · R retry · M mute</p>
  <button id="go">START</button><button class="alt" id="lb">LEADERBOARD</button></div>`;
  $("go").onclick = () => newRun();
  $("lb").onclick = () => showBoard();
}
function showBoard() {
  st = "board"; showPlay(false); menu.classList.remove("off");
  menu.innerHTML = `<div class="card"><h2>TOP 10</h2>${boardHtml()}<p>Ranked by points, faster time wins ties. Saved on this device.</p><button id="go">RACE</button><button class="alt" id="bk">BACK</button></div>`;
  $("go").onclick = () => newRun(); $("bk").onclick = () => showTitle();
}
function gameOver() {
  st = "over"; crashT = 0; audio.crash(); showPlay(false);
  setTimeout(() => {
    menu.classList.remove("off");
    const p = Math.floor(score);
    const q = qualifies(p);
    menu.innerHTML = `<div class="card"><h2>CONTACT!</h2><h1 style="font-size:22px">${p} PTS</h1>
    <p>Lap ${level} · ${fmtT(runT)} · ${sectionAt(pS)} km ${kmAt(pS).toFixed(1)}${bestLap ? ` · best lap ${fmtT(bestLap)}` : ""}</p>
    <div class="bd"><div><span>Distance</span><span>${Math.floor(br.dist)}</span></div><div><span>Overtakes ×${br.nOver}</span><span>${br.over}</span></div><div><span>Near misses ×${br.nNear}</span><span>${br.near}</span></div><div><span>Pickups</span><span>${br.pick}</span></div><div><span>Lap bonuses</span><span>${br.clear}</span></div></div>
    ${q ? `<p>Top 10! Enter initials:</p><input id="ini" maxlength="3" autocomplete="off" /><br><button id="sv">SAVE</button>` : ""}
    <button id="go">RETRY (R)</button><button class="alt" id="lb">BOARD</button></div>`;
    $("go").onclick = () => newRun(); $("lb").onclick = () => showBoard();
    if (q) {
      const inp = $<HTMLInputElement>("ini");
      const save = () => {
        const n = (inp.value.replace(/[^a-z0-9]/gi, "").toUpperCase() || "???").slice(0, 3);
        lastEntry = { n, p, t: Math.round(runT * 10) / 10, l: level, d: Date.now(), b: bestLap ? Math.round(bestLap * 10) / 10 : 0 };
        localStorage.setItem(KEY, JSON.stringify(sortB([...board(), lastEntry])));
        showBoard();
      };
      $("sv").onclick = save;
      inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") save(); });
    }
  }, 900);
}
function pause(on: boolean) {
  if (on && st === "play") {
    st = "pause"; audio.idle(); menu.classList.remove("off");
    menu.innerHTML = `<div class="card"><h2>PAUSED</h2><button id="rs">RESUME</button><button class="alt" id="rt">RETRY</button><button class="alt" id="qt">QUIT</button></div>`;
    $("rs").onclick = () => pause(false); $("rt").onclick = () => newRun(); $("qt").onclick = () => showTitle();
  } else if (!on && st === "pause") { st = "play"; menu.classList.add("off"); }
}

// ---------- minimap (stylised Nordschleife outline) ----------
const MAP: [number, number][] = [[0.18,0.62],[0.12,0.52],[0.16,0.40],[0.26,0.30],[0.33,0.18],[0.42,0.10],[0.50,0.16],[0.55,0.10],[0.64,0.14],[0.72,0.24],[0.82,0.28],[0.90,0.40],[0.86,0.52],[0.78,0.58],[0.74,0.70],[0.66,0.80],[0.56,0.86],[0.46,0.92],[0.36,0.86],[0.30,0.76],[0.24,0.70],[0.18,0.62]];
const mapCv = $<HTMLCanvasElement>("map"), mctx = mapCv.getContext("2d")!;
const segL = MAP.slice(1).map((p, i) => Math.hypot(p[0] - MAP[i][0], p[1] - MAP[i][1]));
const totL = segL.reduce((a, b) => a + b, 0);
function mapPt(f: number): [number, number] { let d = f * totL; for (let i = 0; i < segL.length; i++) { if (d <= segL[i]) { const t = d / segL[i]; return [MAP[i][0] + (MAP[i + 1][0] - MAP[i][0]) * t, MAP[i][1] + (MAP[i + 1][1] - MAP[i][1]) * t]; } d -= segL[i]; } return MAP[0]; }
function drawMap() {
  const w = mapCv.width, h = mapCv.height; mctx.clearRect(0, 0, w, h);
  mctx.fillStyle = "#0008"; mctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) { const [x, y] = mapPt(i / 120); const sc = Math.floor((i / 120) * 3); mctx.fillStyle = sc === 0 ? "#9fb" : sc === 1 ? "#fd8" : "#f9a"; mctx.fillRect(Math.round(x * w), Math.round(y * h), 2, 2); }
  const [x, y] = mapPt(lapPos(pS) / LAP_PX); mctx.fillStyle = "#4fd2ff"; mctx.fillRect(Math.round(x * w) - 2, Math.round(y * h) - 2, 5, 5);
  const [sx, sy] = MAP[0]; mctx.fillStyle = "#fff"; mctx.fillRect(Math.round(sx * w) - 3, Math.round(sy * h), 6, 1);
}

// ---------- audio ----------
const audio = (() => {
  // Engine model: mid-mounted boxer (press reports a flat-6/flat-8 "boxer bark" at the Mission S reveal)
  // + hybrid e-motor whine layered in for E-BOOST. Firing freq = rpm/60 * cyl/2.
  let ac: AudioContext | null = null, master: GainNode, eg: GainNode;
  let oF: OscillatorNode, oH: OscillatorNode, oSub: OscillatorNode, oW: OscillatorNode, lp: BiquadFilterNode, bp: BiquadFilterNode;
  let gW: GainNode, gN: GainNode, am: GainNode, lfo: OscillatorNode, lfoG: GainNode;
  let gear = 1, rpm = 1200, shiftT = 0;
  const CYL = 8, RATIOS = [0, 3.4, 2.4, 1.85, 1.5, 1.25, 1.06, 0.9], REDLINE = 9000;
  let muted = localStorage.getItem("missions.mute") === "1";
  const init = () => {
    if (ac) return;
    ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    eg = ac.createGain(); eg.gain.value = 0; eg.connect(comp).connect(master);
    // soft saturation for warmth, not harshness
    const ws = ac.createWaveShaper(); const cu = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cu[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); } ws.curve = cu;
    lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 2.2; lp.frequency.value = 600;
    am = ac.createGain(); am.gain.value = 0.8; // boxer burble: amplitude wobble at half-order
    lfo = ac.createOscillator(); lfo.type = "triangle"; lfoG = ac.createGain(); lfoG.gain.value = 0.18; lfo.connect(lfoG).connect(am.gain);
    oF = ac.createOscillator(); oF.type = "sawtooth";
    oH = ac.createOscillator(); oH.type = "square";
    oSub = ac.createOscillator(); oSub.type = "triangle";
    const gF = ac.createGain(), gH = ac.createGain(), gS = ac.createGain(); gF.gain.value = 0.35; gH.gain.value = 0.08; gS.gain.value = 0.45;
    oF.connect(gF).connect(ws); oH.connect(gH).connect(ws); oSub.connect(gS).connect(ws);
    ws.connect(lp).connect(am).connect(eg);
    // intake / exhaust air: filtered noise
    const n = ac.sampleRate * 2, nb = ac.createBuffer(1, n, ac.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < n; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true; bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2; gN = ac.createGain(); gN.gain.value = 0.05;
    ns.connect(bp).connect(gN).connect(eg);
    // hybrid e-motor whine (only audible on E-BOOST)
    oW = ac.createOscillator(); oW.type = "sine"; gW = ac.createGain(); gW.gain.value = 0; const wf = ac.createBiquadFilter(); wf.type = "highshelf"; wf.frequency.value = 3000; wf.gain.value = -10;
    oW.connect(wf).connect(gW).connect(eg);
    [oF, oH, oSub, oW, lfo].forEach((o) => o.start()); ns.start();
  };
  const tone = (f: number, f2: number, d: number, type: OscillatorType, v = 0.2) => {
    if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02);
  };
  return {
    get muted() { return muted; },
    start() { init(); ac!.resume(); },
    toggle() { muted = !muted; localStorage.setItem("missions.mute", muted ? "1" : "0"); if (ac) master.gain.value = muted ? 0 : 0.5; $("bmute").textContent = muted ? "×" : "♪"; },
    engine(sp: number, boost: boolean) {
      if (!ac) return; const t = ac.currentTime;
      // speed -> rpm through a 7-speed gearbox, with shifts at ~8600 rpm (PDK-style quick upshift dip)
      const wheel = sp * 26; // arbitrary wheel-rpm scale tuned so lap-1 cruise ~ 5th gear
      let r = wheel * RATIOS[gear];
      if (r > REDLINE - 1200 && gear < 7) { gear++; shiftT = 0.12; }
      else if (gear > 1 && wheel * RATIOS[gear - 1] < REDLINE * 0.62) gear--;
      r = Math.max(1100, wheel * RATIOS[gear]);
      if (shiftT > 0) { shiftT -= 1 / 60; r *= 0.93; }
      rpm += (r - rpm) * 0.25;
      const f = (rpm / 60) * (CYL / 2), load = Math.min(1, rpm / REDLINE);
      oF.frequency.setTargetAtTime(f, t, 0.03); oH.frequency.setTargetAtTime(f * 2, t, 0.03); oSub.frequency.setTargetAtTime(f / 2, t, 0.03);
      lfo.frequency.setTargetAtTime(f / 4, t, 0.05);
      lp.frequency.setTargetAtTime(350 + 2600 * load * load + (boost ? 600 : 0), t, 0.06);
      bp.frequency.setTargetAtTime(500 + 2500 * load, t, 0.08);
      gN.gain.setTargetAtTime(0.02 + 0.06 * load, t, 0.1);
      lfoG.gain.setTargetAtTime(0.25 * (1 - load) + 0.04, t, 0.1); // burbly low down, smooth near redline
      oW.frequency.setTargetAtTime(900 + sp * 9, t, 0.05);
      gW.gain.setTargetAtTime(boost ? 0.07 : 0, t, boost ? 0.08 : 0.3);
      eg.gain.setTargetAtTime(0.1 + 0.16 * load + (boost ? 0.04 : 0), t, 0.08);
    },
    get rpm() { return rpm; }, get gear() { return gear; }, get ready() { return !!ac; },
    idle() { if (ac) eg.gain.setTargetAtTime(0, ac.currentTime, 0.05); },
    blip() { tone(880, 1320, 0.09, "square", 0.08); },
    near() { tone(1200, 2200, 0.12, "triangle", 0.12); },
    pick() { tone(660, 1760, 0.25, "square", 0.08); },
    boost() { tone(300, 2400, 0.6, "sawtooth", 0.1); },
    crash() {
      this.idle(); if (!ac) return; const t = ac.currentTime, n = ac.sampleRate * 0.6, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; g.gain.value = 0.5; s.connect(g).connect(master); s.start(t); tone(160, 40, 0.5, "square", 0.2);
    },
  };
})();
$("bmute").textContent = audio.muted ? "×" : "♪";

// ---------- input ----------
const keys = new Set<string>();
const pointers = new Map<number, number>();
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === "escape" || k === "p") { if (st === "play") pause(true); else if (st === "pause") pause(false); }
  if (k === "m") audio.toggle();
  if (k === "r" && st !== "title") newRun();
  if ((k === " " || k === "shift" || k === "b") && st === "play") fireBoost();
  if (k === "enter" && (st === "title" || st === "board")) newRun();
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
const app = $("app");
app.addEventListener("pointerdown", (e) => {
  if (st !== "play" || (e.target as HTMLElement).closest("button,#menu")) return;
  e.preventDefault(); pointers.set(e.pointerId, e.clientX); audio.start();
});
app.addEventListener("pointermove", (e) => { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e.clientX); });
const up = (e: PointerEvent) => pointers.delete(e.pointerId);
app.addEventListener("pointerup", up); app.addEventListener("pointercancel", up);
bboost.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); fireBoost(); });
$("bpause").onclick = () => (st === "play" ? pause(true) : pause(false));
$("bmute").onclick = () => audio.toggle();
const fsBtn = $("bfs");
if (!document.documentElement.requestFullscreen) fsBtn.style.display = "none";
fsBtn.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); };
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(true); });
function readSteer() {
  let s = 0;
  if (keys.has("arrowleft") || keys.has("a")) s -= 1;
  if (keys.has("arrowright") || keys.has("d")) s += 1;
  const mid = innerWidth / 2;
  for (const x of pointers.values()) s += x < mid ? -1 : 1;
  $("pl").classList.toggle("on", s < 0); $("pr").classList.toggle("on", s > 0);
  return clamp(s, -1, 1);
}
function fireBoost() {
  if (boosts <= 0 || boostT > 0) return;
  boosts--; boostT = 2.5; audio.boost(); showBanner("⚡ E-BOOST", "electric overboost · 2× points");
}

// ---------- update ----------
function addScore(v: number) {
  score += v;
  while (score >= nextBoostAt) { nextBoostAt += 3000; if (boosts < 3) { boosts++; popText("+E-BOOST CHARGE"); } }
}
function update(dt: number) {
  if (st === "over") { crashT += dt; updParts(dt); return; }
  if (st !== "play") return;
  runT += dt;
  steerIn = readSteer();
  const half = width(pS) / 2, c = center(pS);
  const off = Math.abs(px - c) > half - 2;
  const base = baseSpeed(level);
  let target = base * (boostT > 0 ? 1.6 : 1) * (regenT > 0 ? 0.55 : 1) * (off ? 0.45 : 1);
  speed += (target - speed) * Math.min(1, dt * (target < speed ? 3.5 : 1.4));
  const steerSp = (tvT > 0 ? 165 : 105) * (0.7 + 0.3 * Math.min(1, speed / base));
  const steps = Math.max(1, Math.ceil((speed * dt) / 4));
  const sd = dt / steps;
  for (let i = 0; i < steps && st === "play"; i++) {
    pS += speed * sd;
    px += steerIn * steerSp * sd;
    px = clamp(px, center(pS) - half - 40, center(pS) + half + 40);
    stepBots(sd);
  }
  if (st !== "play") return;
  boostT = Math.max(0, boostT - dt); regenT = Math.max(0, regenT - dt); tvT = Math.max(0, tvT - dt);
  comboT -= dt; if (comboT <= 0) combo = 0;
  const dp = ((speed * dt) / PX_PER_M) * (boostT > 0 ? 2 : 1);
  br.dist += dp; addScore(dp);
  camX += (center(pS - 40) * 0.6 + px * 0.4 - camX) * Math.min(1, dt * 4);
  const sct = Math.min(2, Math.floor(((pS - levelStart) / levelLen) * 3));
  if (sct > lastSector) { lastSector = sct; splits.push(runT - lapStartT); popText(`S${sct} ${fmtT(runT - lapStartT)}`); }
  const sec = sectionAt(pS);
  if (sec !== curSection) { curSection = sec; showBanner(sec, sec === "KARUSSELL" ? "banked concrete · hold the line" : ""); }
  // particles
  const sx = px - camX + W / 2, sy = PLAYER_Y();
  if (off && Math.random() < 0.7) parts.push({ x: sx + rnd(-5, 5), y: sy + 8, vx: rnd(-20, 20), vy: rnd(20, 60), life: 0.4, c: Math.random() < 0.5 ? "#2f6b2a" : "#6b4a2a" });
  if (boostT > 0) for (let k = 0; k < 3; k++) parts.push({ x: sx + rnd(-6, 6), y: sy + 9, vx: rnd(-8, 8), vy: rnd(120, 220), life: 0.25, c: Math.random() < 0.5 ? "#4fd2ff" : "#e8fbff" });
  if (regenT > 0 && Math.random() < 0.5) parts.push({ x: sx + rnd(-5, 5), y: sy - 9, vx: 0, vy: -30, life: 0.3, c: "#7dff9a" });
  updParts(dt);
  // pickups
  for (const p of picks) {
    if (p.got) continue;
    const y = sy - (p.s - pS), x = center(p.s) + p.off * width(p.s) / 2;
    if (Math.abs(y - sy) < 11 && Math.abs(x - px) < 9) {
      p.got = true; audio.pick(); addScore(200); br.pick += 200;
      if (p.type === "R") { regenT = 1.6; if (boosts < 3) boosts++; showBanner("REGEN", "braking energy → +1 E-BOOST"); }
      else { tvT = 6; showBanner("TORQUE VECTORING", "sharper steering · 6 s"); }
    }
  }
  if (pS >= levelStart + levelLen) {
    const lt = runT - lapStartT; if (!bestLap || lt < bestLap) bestLap = lt;
    lastClearBonus = 1000 * level; addScore(lastClearBonus); br.clear += lastClearBonus;
    st = "clear"; clearT = 1.8; audio.pick(); showBanner(`LAP ${level} CLEAR`, `${fmtT(runT - lapStartT)} · +${lastClearBonus} · next lap faster`);
  }
  audio.engine(speed, boostT > 0);
}
function stepBots(dt: number) {
  const base = baseSpeed(level);
  for (const b of bots) {
    b.t -= dt;
    if (b.t <= 0) {
      if (b.kind === 1) { b.tOff = clamp(b.tOff + (Math.random() < 0.5 ? -0.8 : 0.8), -0.7, 0.7); b.t = rnd(1.2, 2.4); }
      else if (b.kind === 2) { b.brake = 0.9; b.t = rnd(2, 3.5); }
      else if (b.kind === 3) { b.t = 0.4; const dy0 = b.s - pS; if (dy0 > 30 && dy0 < 160) b.tOff = clamp((px - center(b.s)) / (width(b.s) / 2 - 7) * 0.7, -0.7, 0.7); }
      else b.t = 99;
    }
    b.brake = Math.max(0, b.brake - dt);
    b.off += (b.tOff - b.off) * Math.min(1, dt * 2.2);
    b.s += base * b.ratio * (b.brake > 0 ? 0.35 : 1) * dt;
    const bx = center(b.s) + b.off * (width(b.s) / 2 - 7);
    const dy = b.s - pS, dx = Math.abs(bx - px);
    if (Math.abs(dy) < 17 && dx < 9) { gameOver(); return; }
    if (Math.abs(dy) < 18) b.gap = Math.min(b.gap, dx - 9);
    if (!b.passed && dy < -18) {
      b.passed = true; addScore(50); br.over += 50; br.nOver++; audio.blip();
      if (b.gap <= 5) {
        combo++; comboT = 3; const v = 100 * Math.min(combo, 5); addScore(v); br.near += v; br.nNear++; audio.near();
        popText(combo > 1 ? `NEAR MISS x${Math.min(combo, 5)} +${v}` : `NEAR MISS +${v}`);
      } else { combo = 0; popText("+50 OVERTAKE"); }
    }
  }
  bots = bots.filter((b) => b.s > pS - 400);
}
function updParts(dt: number) {
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  parts = parts.filter((p) => p.life > 0);
}

// ---------- render ----------
function drawCar(x: number, y: number, body: string, accent: string, player: boolean, brake = false) {
  x = Math.round(x) - 5; y = Math.round(y) - 9;
  const f = (c: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  f("rgba(0,0,0,.35)", 1, 2, 10, 18);
  f("#111", -1, 3, 2, 4); f("#111", 9, 3, 2, 4); f("#111", -1, 12, 2, 4); f("#111", 9, 12, 2, 4);
  f(body, 0, 1, 10, 16); f(body, 1, 0, 8, 18);
  f(player ? "#cfd6dc" : body, 2, 1, 6, 3);
  f("#1a2430", 1, 5, 8, 3); f("#2a3a4a", 2, 6, 6, 1);
  f(accent, 4, 0, 2, 5);
  f("#1a2430", 2, 12, 6, 2);
  f(player ? "#eaffff" : "#ffe9a8", 1, 0, 3, 1); f(player ? "#eaffff" : "#ffe9a8", 6, 0, 3, 1);
  f(brake ? "#ff2a2a" : "#a01818", 1, 17, 8, 1);
  if (player) { f("#ff3b3b", 1, 17, 8, 1); f(accent, 0, 9, 1, 3); f(accent, 9, 9, 1, 3); }
}
function render() {
  const pY = OG ? 92 : PLAYER_Y();
  const shiftX = W / 2 - camX;
  const kar = (s: number) => sectionAt(s) === "KARUSSELL";
  for (let y = 0; y < H; y++) {
    const s = pS + (pY - y);
    const c = center(s) + shiftX, hw = width(s) / 2;
    const L = Math.round(c - hw), R = Math.round(c + hw);
    const band = Math.floor(s / 8);
    // forest
    ctx.fillStyle = "#123a1a"; ctx.fillRect(0, y, W, 1);
    // grass
    ctx.fillStyle = (Math.floor(s / 24) & 1) ? "#3c8a34" : "#357d2e";
    ctx.fillRect(L - 22, y, R - L + 44, 1);
    // armco
    ctx.fillStyle = (band & 1) ? "#b8bec4" : "#8a9096";
    ctx.fillRect(L - 24, y, 2, 1); ctx.fillRect(R + 22, y, 2, 1);
    // trees
    for (let bx = 0; bx < W; bx += 6) {
      const wx = bx - shiftX;
      if (bx > L - 30 && bx < R + 26) continue;
      const h = hash(Math.floor(wx / 6) * 31 + Math.floor(s / 6));
      if (h > 0.55) { ctx.fillStyle = h > 0.85 ? "#2c6e2a" : h > 0.7 ? "#1f5a24" : "#0c2a12"; ctx.fillRect(bx, y, 6, 1); }
    }
    // road
    ctx.fillStyle = kar(s) ? ((band & 1) ? "#8d8f8a" : "#7f817c") : ((Math.floor(s / 4) & 1) ? "#4a4c50" : "#46484c");
    ctx.fillRect(L, y, R - L, 1);
    // curbs
    ctx.fillStyle = (band & 1) ? "#e03030" : "#f4f4f4";
    ctx.fillRect(L, y, 3, 1); ctx.fillRect(R - 3, y, 3, 1);
    // dashed centre + start line
    if ((Math.floor(s / 14) % 2) === 0 && !kar(s)) { ctx.fillStyle = "#c9c9b8"; ctx.fillRect(Math.round(c), y, 1, 1); }
    const rel = s - levelStart;
    if (rel >= 0 && rel < 6) { ctx.fillStyle = ((Math.floor((y + 0) / 2) + 0) & 1) ? "#fff" : "#111"; for (let q = L; q < R; q += 2) { ctx.fillStyle = ((q >> 1) + Math.floor(rel / 2)) & 1 ? "#fff" : "#111"; ctx.fillRect(q, y, 2, 1); } }
    // km markers
    if (Math.floor(s) % 1000 < 2 && s > 0) { ctx.fillStyle = "#fff"; ctx.fillRect(R + 26, y - 4, 6, 6); ctx.fillStyle = "#111"; ctx.fillRect(R + 28, y - 3, 2, 4); }
  }
  // pickups
  for (const p of picks) {
    if (p.got) continue;
    const y = pY - (p.s - pS); if (y < -10 || y > H + 10) continue;
    const x = Math.round(center(p.s) + p.off * width(p.s) / 2 + shiftX);
    const blink = Math.floor(performance.now() / 150) & 1;
    ctx.fillStyle = p.type === "R" ? "#7dff9a" : "#ffd23f"; ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = blink ? "#fff" : "#111"; ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  for (const b of bots) {
    const y = pY - (b.s - pS); if (y < -20 || y > H + 20) continue;
    drawCar(center(b.s) + b.off * (width(b.s) / 2 - 7) + shiftX, y, b.col, "#222", false, b.brake > 0);
  }
  // player
  const sx = px + shiftX;
  if (boostT > 0) { ctx.fillStyle = "#4fd2ff"; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(sx - 8 + hash(i + Math.floor(performance.now() / 50)) * 16), pY + 10 + i * 3, 1, 6); }
  if (st !== "over" || Math.floor(crashT * 10) % 2 === 0) drawCar(sx, pY, "#c4ccd4", "#26d0ff", true);
  for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
  if (st === "over") { ctx.fillStyle = `rgba(255,60,40,${Math.max(0, 0.5 - crashT)})`; ctx.fillRect(0, 0, W, H); }
}

// pixel text (binary-thresholded so it stays crisp when scaled)
function pixelText(t: string, x: number, y: number, size: number, col: string, shadow: string) {
  const oc = document.createElement("canvas"); oc.width = W; oc.height = H; const o = oc.getContext("2d")!;
  o.font = `bold ${size}px "Press Start 2P", monospace`; o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff"; o.fillText(t, x, y);
  const d = o.getImageData(0, 0, W, H).data;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 110) {
    ctx.fillStyle = shadow; ctx.fillRect(xx + 1, yy + 1, 1, 1);
  }
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 110) { ctx.fillStyle = col; ctx.fillRect(xx, yy, 1, 1); }
}

// ---------- loop ----------
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (st === "title" || st === "board") { pS += 60 * dt; px = center(pS); camX = px; }
  if (st === "clear") {
    clearT -= dt; pS += speed * dt; camX += (center(pS) - camX) * dt * 2; px += (center(pS) - px) * dt * 3;
    if (clearT <= 0) { level++; startLevel(); st = "play"; }
  }
  update(dt);
  render();
  if (st === "play" || st === "clear" || st === "pause") updHud();
  requestAnimationFrame(frame);
}

if (OG) {
  // static share-image scene
  document.querySelectorAll("#hud,#tl,#pads,#menu,#banner,#pop").forEach((e) => e.remove());
  cv.style.width = "1200px"; cv.style.height = "630px";
  document.fonts.load('16px "Press Start 2P"').finally(() => {
    pS = 5600; px = center(pS) + 8; camX = center(pS); boostT = 1; st = "play"; levelStart = -1e9;
    bots = [
      { s: pS + 46, off: -0.55, tOff: 0, ratio: 0, base: 0, kind: 0, t: 0, brake: 0, passed: false, gap: 0, col: "#d23b3b" },
      { s: pS + 20, off: 0.6, tOff: 0, ratio: 0, base: 0, kind: 0, t: 0, brake: 0.5, passed: false, gap: 0, col: "#f0c419" },
    ];
    picks = []; render(); st = "title";
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 10, W, 40);
    pixelText("MISSION S", W / 2, 25, 16, "#eef3f6", "#1e7a9a");
    pixelText("NORDSCHLEIFE · E-BOOST", W / 2, 42, 8, "#7ff0ff", "#000");
    (window as any).ogReady = true;
  });
} else {
  showTitle();
  requestAnimationFrame(frame);
}
(window as any).__ms = { audio, get bestLap() { return bestLap; }, get km() { return kmAt(pS); }, jump(d: number) { pS += d; }, get st() { return st; }, get score() { return score; }, get runT() { return runT; }, get px() { return px; }, get pS() { return pS; }, get level() { return level; }, forceBot() { const b = bots[0] || ({} as Bot); bots.unshift({ ...b, s: pS + 40, off: (px - center(pS + 40)) / (width(pS + 40) / 2 - 7), tOff: (px - center(pS + 40)) / (width(pS + 40) / 2 - 7), ratio: 0, kind: 0, t: 99, brake: 0, passed: false, gap: 99, col: "#d23b3b" }); } };

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

// ---------- track ----------
const SECTIONS = ["HATZENBACH", "FLUGPLATZ", "FUCHSRÖHRE", "ADENAUER FORST", "BERGWERK", "KARUSSELL", "HOHE ACHT", "BRÜNNCHEN", "PFLANZGARTEN", "SCHWALBENSCHWANZ", "DÖTTINGER HÖHE"];
const SECTION_LEN = 1400;
const sectionAt = (s: number) => SECTIONS[Math.floor(Math.max(0, s) / SECTION_LEN) % SECTIONS.length];
function center(s: number) {
  let c = 46 * Math.sin(s / 820) + 22 * Math.sin(s / 330 + 1.3);
  const sec = sectionAt(s);
  if (sec === "KARUSSELL") { const k = (s % SECTION_LEN) / SECTION_LEN; c += 40 * Math.sin(k * Math.PI); }
  if (sec === "FUCHSRÖHRE") c += 18 * Math.sin(s / 160);
  return c;
}
function width(s: number) {
  const n = Math.sin(s / 1150 + 2);
  const narrow = clamp((n - 0.45) / 0.35, 0, 1);
  return 80 - 26 * narrow * narrow * (3 - 2 * narrow);
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
const levelTime = (L: number) => 12 * Math.pow(1.3, L - 1);
const levelLength = (L: number) => baseSpeed(L) * 0.92 * levelTime(L);
const botCount = (L: number) => 3 + 2 * (L - 1);
const BOT_COLS = ["#d23b3b", "#f0c419", "#3b7bd2", "#e8e8e8", "#38a84a", "#ff7a1a", "#9b4fd2", "#222"];

function startLevel() {
  levelStart = pS; levelLen = levelLength(level);
  bots = []; picks = [];
  const n = botCount(level);
  const span = levelLen - 400;
  for (let i = 0; i < n; i++) {
    const s = levelStart + 260 + (span * (i + rnd(0.1, 0.9))) / n;
    const kind = level === 1 ? 0 : Math.floor(rnd(0, Math.min(3, 1 + level / 2)) );
    const off = rnd(-0.6, 0.6);
    bots.push({ s, off, tOff: off, ratio: rnd(0.42, 0.62), base: 0, kind, t: rnd(0, 3), brake: 0, passed: false, gap: 99, col: BOT_COLS[i % BOT_COLS.length] });
  }
  const np = 1 + Math.floor(level / 2);
  for (let i = 0; i < np; i++) picks.push({ s: levelStart + rnd(0.2, 0.9) * levelLen, off: rnd(-0.5, 0.5), type: i % 2 ? "T" : "R", got: false });
  showBanner(`LAP ${level}`, `${Math.round(levelLength(level) / PX_PER_M)} m · ${n} bots`);
}
function newRun() {
  level = 1; pS = 0; px = center(0); camX = px; speed = 0; score = 0; runT = 0;
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
  const fx: string[] = [];
  if (boostT > 0) fx.push("⚡ E-BOOST");
  if (regenT > 0) fx.push("REGEN");
  if (tvT > 0) fx.push("TORQUE VECTORING " + tvT.toFixed(1));
  $("fx").innerHTML = fx.join("<br>");
  $("pips").textContent = "■".repeat(boosts) + "□".repeat(3 - boosts);
  bboost.disabled = boosts === 0 || boostT > 0;
}

type Entry = { n: string; p: number; t: number; l: number; d: number };
const KEY = "missions.board.v1";
const board = (): Entry[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const sortB = (b: Entry[]) => b.sort((a, c) => c.p - a.p || a.t - c.t).slice(0, 10);
function qualifies(p: number) { const b = board(); return p > 0 && (b.length < 10 || p > b[b.length - 1].p || (p === b[b.length - 1].p && runT < b[b.length - 1].t)); }
let lastEntry: Entry | null = null;
function boardHtml() {
  const b = board();
  if (!b.length) return `<p>No runs yet. Be the first.</p>`;
  return `<table><tr><th>#</th><th>NAME</th><th>LAP</th><th class="r">TIME</th><th class="r">PTS</th></tr>${b
    .map((e, i) => `<tr class="${lastEntry && e.d === lastEntry.d ? "me" : ""}"><td>${i + 1}</td><td>${e.n}</td><td>${e.l}</td><td class="r">${fmtT(e.t)}</td><td class="r">${e.p}</td></tr>`).join("")}</table>`;
}
function showTitle() {
  st = "title"; showPlay(false); menu.classList.remove("off");
  menu.innerHTML = `<div class="card"><h2>LH CARS PRESENTS</h2><h1>MISSION S</h1>
  <p>An all-electric sports car on the Nordschleife.</p>
  <p class="feat">⚡ E-BOOST overboost · REGEN braking · TORQUE VECTORING</p>
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
    <p>Lap ${level} · ${fmtT(runT)} · ${sectionAt(pS)}</p>
    <div class="bd"><div><span>Distance</span><span>${Math.floor(br.dist)}</span></div><div><span>Overtakes ×${br.nOver}</span><span>${br.over}</span></div><div><span>Near misses ×${br.nNear}</span><span>${br.near}</span></div><div><span>Pickups</span><span>${br.pick}</span></div><div><span>Lap bonuses</span><span>${br.clear}</span></div></div>
    ${q ? `<p>Top 10! Enter initials:</p><input id="ini" maxlength="3" autocomplete="off" /><br><button id="sv">SAVE</button>` : ""}
    <button id="go">RETRY (R)</button><button class="alt" id="lb">BOARD</button></div>`;
    $("go").onclick = () => newRun(); $("lb").onclick = () => showBoard();
    if (q) {
      const inp = $<HTMLInputElement>("ini");
      const save = () => {
        const n = (inp.value.replace(/[^a-z0-9]/gi, "").toUpperCase() || "???").slice(0, 3);
        lastEntry = { n, p, t: Math.round(runT * 10) / 10, l: level, d: Date.now() };
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

// ---------- audio ----------
const audio = (() => {
  let ac: AudioContext | null = null, master: GainNode, eg: GainNode, o1: OscillatorNode, o2: OscillatorNode, lp: BiquadFilterNode;
  let muted = localStorage.getItem("missions.mute") === "1";
  const init = () => {
    if (ac) return;
    ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    eg = ac.createGain(); eg.gain.value = 0; lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
    o1 = ac.createOscillator(); o1.type = "sawtooth"; o2 = ac.createOscillator(); o2.type = "sine";
    const g1 = ac.createGain(); g1.gain.value = 0.25; o1.connect(g1).connect(lp); o2.connect(lp); lp.connect(eg).connect(master);
    o1.start(); o2.start();
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
      if (!ac) return; const t = ac.currentTime, f = 120 + sp * 2.2 + (boost ? 260 : 0);
      o1.frequency.setTargetAtTime(f * 0.5, t, 0.08); o2.frequency.setTargetAtTime(f * 2, t, 0.08);
      eg.gain.setTargetAtTime(0.05 + Math.min(sp, 400) / 2600, t, 0.1);
    },
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
    lastClearBonus = 1000 * level; addScore(lastClearBonus); br.clear += lastClearBonus;
    st = "clear"; clearT = 1.8; audio.pick(); showBanner(`LAP ${level} CLEAR`, `+${lastClearBonus} · next lap faster`);
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
(window as any).__ms = { get st() { return st; }, get score() { return score; }, get runT() { return runT; }, get px() { return px; }, get pS() { return pS; }, get level() { return level; }, forceBot() { const b = bots[0] || ({} as Bot); bots.unshift({ ...b, s: pS + 40, off: (px - center(pS + 40)) / (width(pS + 40) / 2 - 7), tOff: (px - center(pS + 40)) / (width(pS + 40) / 2 - 7), ratio: 0, kind: 0, t: 99, brake: 0, passed: false, gap: 99, col: "#d23b3b" }); } };

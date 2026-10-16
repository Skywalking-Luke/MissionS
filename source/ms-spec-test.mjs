import { chromium, devices } from "playwright";
const U = "http://localhost:8799/MissionS/"; const b = await chromium.launch(); const out = {};
for (const [name, opts] of [["phone", { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } }], ["laptop", { viewport: { width: 1280, height: 800 } }]]) {
  const p = await (await b.newContext(opts)).newPage(); const errs = [];
  p.on("pageerror", e => errs.push(String(e))); p.on("console", m => m.type() === "error" && errs.push(m.text()));
  await p.goto(U); await p.click("#go"); await p.evaluate(() => __ms.setGod(true));
  const g = () => p.evaluate(() => ({ t: +__ms.runT.toFixed(1), v: Math.round(__ms.vK), gear: __ms.gearN, rpm: Math.round(__ms.rpmN), hud: document.getElementById("kmh").textContent.trim() }));
  const launch = []; let t100 = null, t200 = null;
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(250); const x = await g(); launch.push(x.gear); if (!t100 && x.v >= 100) t100 = x.t; if (!t200 && x.v >= 200) t200 = x.t; }
  // jump to Döttinger Höhe start (straight), measure top
  await p.evaluate(() => __ms.jump(17.6 / 20.8 * 19000 - __ms.pS)); await p.evaluate(() => __ms.setV(200));
  let top = { v: 0 }; for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); const x = await g(); if (x.v > top.v) top = x; }
  // brake
  const pre = await g();
  if (name === "phone") await p.dispatchEvent("#bbrake", "pointerdown", { pointerId: 3, bubbles: true }); else await p.keyboard.down("ArrowDown");
  await p.waitForTimeout(2500); const br = await g();
  if (name === "phone") await p.dispatchEvent("#bbrake", "pointerup", { pointerId: 3, bubbles: true }); else await p.keyboard.up("ArrowDown");
  if (name === "phone") { await p.waitForTimeout(800); await p.screenshot({ path: "/workspace/ms3-run.png" }); }
  out[name] = { errs, t100, t200, gearsSeenLaunch: [...new Set(launch)].join(","), top, beforeBrake: pre, afterBrake2_5s: br };
}
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.goto(U);
out.plan = await p.evaluate(() => [1,2,3,4,5,6,7,8].map(L => ({ L, ...__ms.botPlan(L) })));
await p.click("#spec"); await p.waitForTimeout(300); await p.screenshot({ path: "/workspace/ms3-spec.png" });
console.log(JSON.stringify(out)); await b.close();

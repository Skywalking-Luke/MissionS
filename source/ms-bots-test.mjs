import { chromium, devices } from "playwright";
const b = await chromium.launch(); const out = {};
async function t(label, U, opts, hooks) {
  const p = await (await b.newContext(opts)).newPage(); const errs = [];
  p.on("pageerror", e => errs.push(String(e))); p.on("console", m => m.type() === "error" && errs.push(m.text()));
  await p.goto(U); await p.click("#go");
  if (hooks) await p.evaluate(() => __ms.setGod(true));
  // count frames with a visible bot, by pixel scan if no hook: use visBots when available
  const seen = []; let first = null;
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(500); const v = await p.evaluate(() => __ms.visBots ?? -1); seen.push(v); if (first === null && v > 0) first = (i + 1) * 0.5; }
  const km = [];
  if (hooks) for (const k of [3, 7, 10, 14, 18]) {
    await p.evaluate((k) => __ms.jump(k / 20.8 * 19000 - __ms.pS), k); let mx = 0;
    for (let i = 0; i < 12; i++) { await p.waitForTimeout(500); mx = Math.max(mx, await p.evaluate(() => __ms.visBots)); }
    km.push([k, mx]);
  }
  out[label] = { errs, firstBotAt_s: first, visibleSamples: seen.join(","), kmMaxVisible: km, st: await p.evaluate(() => __ms.st), sprites: await p.evaluate(() => !!__ms.sprites) };
}
await t("local-phone", "http://localhost:8799/MissionS/", { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } }, true);
await t("local-laptop", "http://localhost:8799/MissionS/", { viewport: { width: 1280, height: 800 } }, true);
console.log(JSON.stringify(out, null, 1)); await b.close();

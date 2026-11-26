// Playwright frame renderer.
//   node render.mjs frames "0-1253"        -> frames/f0000.jpg ...  (RESUME=1 skips existing files)
//   node render.mjs stills/a "5,40,90"     -> stills/a/f0005.jpg ...
//   node render.mjs manifest manifest.json frames [0,30,89] -> render storyboard-selected frames
//   node render.mjs page charsheet.html out.png   -> screenshot of a test page (waits for window.done)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "web");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const [, , outArg, spec, extra, frameArg] = process.argv;
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error("[page]", m.text()); });
page.on("pageerror", (e) => console.error("[pageerror]", e.message));

if (outArg === "manifest") {
  const manifest = JSON.parse(fs.readFileSync(spec, "utf8"));
  if (manifest.manifest_version !== 1 || !Number.isInteger(manifest.total_frames) || manifest.total_frames < 1) {
    throw new Error("Invalid render manifest");
  }
  const dataFile = path.join(ROOT, "storyboard-data.js");
  fs.writeFileSync(dataFile, "window.STORYBOARD_MANIFEST = " + JSON.stringify(manifest) + ";\\n", "utf8");
  const parse = (s) => s.split(",").flatMap((t) => { const m = t.match(/^(\\d+)-(\\d+)$/); if (!m) return [Number(t)]; const a = []; for (let i = +m[1]; i <= +m[2]; i++) a.push(i); return a; });
  const frames = parse(frameArg || `0-${manifest.total_frames - 1}`);
  if (frames.some((f) => !Number.isInteger(f) || f < 0 || f >= manifest.total_frames)) throw new Error("Frame index outside manifest duration");
  fs.mkdirSync(extra, { recursive: true });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction("window.ready === true", null, { timeout: 300000 });
  if (await page.evaluate(() => window.TOTAL) !== manifest.total_frames) throw new Error("Browser did not load storyboard frame count");
  const t0 = Date.now();
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], file = path.join(extra, `f${String(f).padStart(4, "0")}.jpg`);
    const url = await page.evaluate((n) => window.renderFrame(n), f);
    fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
    if (i % 10 === 0 || frames.length < 40) console.log(`manifest frame ${f} done (${i + 1}/${frames.length}, ${((Date.now() - t0) / (i + 1) / 1000).toFixed(2)} s/frame)`);
  }
  console.log(`DONE ${frames.length} storyboard frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (outArg === "page") {
  await page.setViewportSize({ width: 2400, height: 2200 });
  try {
    await page.goto(`http://127.0.0.1:${port}/${spec}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction("window.done === true", null, { timeout: 120000 });
    if (await page.locator("#grid").count()) await page.screenshot({ path: extra, fullPage: true });
    else await page.locator("canvas").first().screenshot({ path: extra });
    console.log("wrote", extra);
  } catch (error) {
    console.error("[render-page-failure]", error?.stack || error);
    try { await page.screenshot({ path: extra + ".diagnostic.png", fullPage: true }); } catch (shotError) { console.error("[diagnostic-screenshot-failure]", shotError.message); }
    try { console.error("[page-html]", (await page.locator("body").innerText()).slice(0, 12000)); } catch {}
    throw error;
  }
} else {
  const parse = (s) => s.split(",").flatMap((t) => { const m = t.match(/^(\d+)-(\d+)$/); if (!m) return [Number(t)]; const a = []; for (let i = +m[1]; i <= +m[2]; i++) a.push(i); return a; });
  const frames = parse(spec);
  fs.mkdirSync(outArg, { recursive: true });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction("window.ready === true", null, { timeout: 300000 });
  const t0 = Date.now();
  let n = 0;
  for (const f of frames) {
    const file = path.join(outArg, `f${String(f).padStart(4, "0")}.jpg`);
    if (process.env.RESUME && fs.existsSync(file) && fs.statSync(file).size > 1000) continue;
    const url = await page.evaluate((f) => window.renderFrame(f), f);
    fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
    n++;
    if (n % 10 === 0 || frames.length < 40) console.log(`frame ${f} done (${n} rendered, ${((Date.now() - t0) / n / 1000).toFixed(2)} s/frame)`);
  }
  console.log(`DONE ${n} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await browser.close();
server.close();

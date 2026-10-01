// Headless driver for optional browser export/probe runs.
//
//   node scripts/migration/browser_driver.mjs <module-in-scripts/migration/browser> [json-config] [--out DIR]
//
// Starts the normal reference server (scripts/serve.py) on a private port,
// opens the unchanged browser game in headless Chrome with an isolated QA
// notebook (`?debug&qa`), and runs one module from
// scripts/migration/browser/ inside the page. Nothing in web/src/ is modified:
//   * /__migration/* requests are answered from scripts/migration/browser/
//     and scripts/migration/vendor/ by request interception;
//   * when globalThis.__MIGRATION_RETAIN_BATCHES is set (only by this
//     driver), an appended snippet in the *served* copy of web/src/core/kit.js
//     keeps each Batch's pre-merge parts so sections can be captured before
//     broad material merging. The on-disk file and normal play are untouched.
// Files the module passes to window.__migrationSave(path, base64) are written
// below --out (default shared/data/export).
import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = +(process.env.EXPORT_PORT || 8017);
const [VW, VH] = (process.env.BROWSER_VIEWPORT || '1280x720').split('x').map(Number);
const modName = process.argv[2];
const cfgFile = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
const outAt = process.argv.indexOf('--out');
const OUT = path.resolve(outAt >= 0 ? process.argv[outAt + 1] : path.join(ROOT, 'shared/data/export'));
if (!modName) { console.error('usage: browser_driver.mjs <module> [config.json] [--out DIR]'); process.exit(2); }

const RETAIN = `
;/* migration export adapter (served copy only, scripts/migration/browser_driver.mjs) */
if (globalThis.__MIGRATION_RETAIN_BATCHES) {
  const __build = Batch.prototype.build;
  Batch.prototype.build = function (M) {
    const g = __build.call(this, M);
    (globalThis.__migrationBatches ||= []).push({ batch: this, group: g });
    return g;
  };
}
`;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

const server = spawn('python3', [path.join(ROOT, 'scripts/serve.py'), '--port', String(PORT)], { stdio: ['ignore', 'ignore', 'pipe'] });
await new Promise(r => setTimeout(r, 800));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu', `--window-size=${VW},${VH}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: VW, height: VH, deviceScaleFactor: 1 },
  protocolTimeout: 1800000,
});
let exitCode = 0;
try {
  const page = await browser.newPage();
  page.on('console', m => { const t = m.text(); if (!/^\[vite\]|DevTools/.test(t)) console.log('[page]', t.slice(0, 400)); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.exposeFunction('__migrationSave', (rel, b64) => {
    const f = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(f, buf);
    return { path: path.relative(ROOT, f), bytes: buf.length, sha256: sha(buf) };
  });
  await page.exposeFunction('__migrationShot', async rel => {
    const f = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    await page.screenshot({ path: f });
    return path.relative(ROOT, f);
  });
  await page.evaluateOnNewDocument(() => { globalThis.__MIGRATION_RETAIN_BATCHES = true; });
  await page.setRequestInterception(true);
  const kitPath = path.join(ROOT, 'web/src/core/kit.js');
  page.on('request', req => {
    const u = new URL(req.url());
    if (u.pathname.startsWith('/__migration/')) {
      const rel = decodeURIComponent(u.pathname.slice('/__migration/'.length));
      const f = rel.startsWith('vendor/') ? path.join(HERE, rel) : path.join(HERE, 'browser', rel);
      if (!f.startsWith(HERE) || !fs.existsSync(f)) return req.respond({ status: 404, body: 'missing' });
      return req.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f, 'utf8') });
    }
    if (u.pathname === '/src/core/kit.js') {
      return req.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(kitPath, 'utf8') + RETAIN });
    }
    req.continue();
  });
  const url = `http://localhost:${PORT}/?debug&qa&quality=balanced&time=15`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__abbey && document.getElementById('loader')?.classList.contains('done'), { timeout: 300000, polling: 500 });
  await page.waitForFunction(() => window.__abbey?.walker?.colliders?.length > 0, { timeout: 120000 });
  // let the cast/tasks finish loading (people are excluded, but stay quiet)
  await new Promise(r => setTimeout(r, 1500));
  const cfg = cfgFile ? JSON.parse(fs.readFileSync(path.resolve(cfgFile), 'utf8')) : {};
  const result = await page.evaluate(async (mod, cfg) => {
    const m = await import('/__migration/' + mod);
    return await m.run(cfg);
  }, modName, cfg);
  const report = { module: modName, url, kit_js_sha256: sha(fs.readFileSync(kitPath)), served_adapter_sha256: sha(RETAIN), result };
  fs.mkdirSync(OUT, { recursive: true });
  const rp = path.join(OUT, modName.replace(/\.js$/, '') + '.report.json');
  fs.writeFileSync(rp, JSON.stringify(report, null, 1) + '\n');
  console.log('report', path.relative(ROOT, rp));
} catch (e) {
  console.error(e); exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
process.exit(exitCode);

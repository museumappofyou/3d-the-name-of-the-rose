// Mean luminance of matching native/browser frames over HUD-free regions.
//   node scripts/migration/compare_shots.mjs <nativeDir> <nativeLabel> <browserDir> [--out <dir>] [names...]
// With --out: compare.json and <name>_compare.jpg (browser left, native right).
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const argv = process.argv.slice(2);
const oi = argv.indexOf('--out');
const outDir = oi >= 0 ? argv.splice(oi, 2)[1] : null;
const [nd, label, bd, ...names] = argv;
const REGIONS = { centre: [0.25, 0.18, 0.5, 0.36], left: [0.05, 0.25, 0.18, 0.45], right: [0.77, 0.2, 0.18, 0.45], low: [0.3, 0.62, 0.4, 0.12] };
async function stats(f) {
  const img = sharp(f); const { width: W, height: H } = await img.metadata();
  const raw = await img.removeAlpha().raw().toBuffer();
  const out = {};
  for (const [k, [x, y, w, h]] of Object.entries(REGIONS)) {
    let s = 0, r = 0, g = 0, b = 0, n = 0;
    for (let j = Math.floor(y * H); j < Math.floor((y + h) * H); j++) for (let i = Math.floor(x * W); i < Math.floor((x + w) * W); i++) {
      const o = (j * W + i) * 3; r += raw[o]; g += raw[o + 1]; b += raw[o + 2]; s += 0.2126 * raw[o] + 0.7152 * raw[o + 1] + 0.0722 * raw[o + 2]; n++;
    }
    out[k] = { lum: +(s / n).toFixed(1), rgb: [r / n, g / n, b / n].map(v => +v.toFixed(0)) };
  }
  return out;
}
const list = names.length ? names : fs.readdirSync(bd).filter(f => f.endsWith('_browser.png')).map(f => f.replace('_browser.png', ''));
const report = { native_label: label, regions: REGIONS, note: 'mean Rec.709 luma of 8-bit sRGB output (0-255), native / browser', shots: {} };
if (outDir) fs.mkdirSync(outDir, { recursive: true });
for (const n of list) {
  const a = path.join(nd, `${n}_${label}.png`), b = path.join(bd, `${n}_browser.png`);
  if (!fs.existsSync(a) || !fs.existsSync(b)) continue;
  const [sa, sb] = [await stats(a), await stats(b)];
  report.shots[n] = Object.fromEntries(Object.keys(REGIONS).map(k => [k, { native: sa[k].lum, browser: sb[k].lum, ratio: +(sa[k].lum / Math.max(1, sb[k].lum)).toFixed(2) }]));
  console.log(n.padEnd(18), Object.keys(REGIONS).map(k => `${k}: ${sa[k].lum}/${sb[k].lum}`).join('  '));
  if (outDir) {
    const half = async f => sharp(f).removeAlpha().resize(960, 540).toBuffer();
    await sharp({ create: { width: 1920, height: 540, channels: 3, background: '#000' } })
      .composite([{ input: await half(b), left: 0, top: 0 }, { input: await half(a), left: 960, top: 0 }])
      .jpeg({ quality: 86 }).toFile(path.join(outDir, `${n}_compare.jpg`));
  }
}
if (outDir) fs.writeFileSync(path.join(outDir, 'compare.json'), JSON.stringify(report, null, 1) + '\n');

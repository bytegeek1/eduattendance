/* ============================================================================
   Offline frame renderer.

   Opens the explainer in headless Chrome at exactly 1920x1080, then walks the
   timeline one frame at a time calling window.__seek(t) and screenshotting.
   Because seek() is a pure function of time (see anim.js) the result is
   deterministic — re-running produces byte-identical frames.

     node render.js                 all 80s at 30fps
     node render.js --fps 30        frame rate
     node render.js --from 0 --to 16   render only part of the timeline

   Frames land in ./frames as 000000.png, 000001.png, ...
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? Number(process.argv[i + 1]) : def;
};

const FPS  = arg('fps', 30);
const FROM = arg('from', 0);
const TO   = arg('to', null);
const W = 1920, H = 1080;
const OUT = path.join(__dirname, 'frames');
const PAGE = 'file://' + path.join(__dirname, 'index.html').replace(/\\/g, '/');

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none']
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  await page.goto(PAGE, { waitUntil: 'networkidle' });

  /* Never capture on fallback fonts — anim.js flips __ready once
     document.fonts.ready resolves. */
  await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
  await page.waitForTimeout(400);

  const dur = TO !== null ? TO : await page.evaluate('window.__DUR');
  const total = Math.round((dur - FROM) * FPS);
  console.log(`rendering ${total} frames · ${FROM}s→${dur}s @ ${FPS}fps · ${W}x${H}`);

  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const t = FROM + i / FPS;
    await page.evaluate((tt) => window.__seek(tt), t);
    await page.screenshot({
      path: path.join(OUT, String(i).padStart(6, '0') + '.png'),
      animations: 'disabled'
    });
    if (i % 30 === 0 || i === total - 1) {
      const pct = ((i + 1) / total * 100).toFixed(0);
      const el = ((Date.now() - t0) / 1000).toFixed(0);
      process.stdout.write(`\r  ${pct}%  frame ${i + 1}/${total}  ${el}s elapsed   `);
    }
  }
  process.stdout.write('\n');

  await browser.close();
  console.log(`done — ${total} frames in ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });

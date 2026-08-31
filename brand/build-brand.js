/* ============================================================================
   Builds the whole brand asset pack from one source of truth.

     cd brand && node build-brand.js

   Everything below derives from A_PATH + TICK, so the mark can never drift
   between the favicon, the social avatars and the covers. Re-run after any
   change to those two paths.
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../video/node_modules/playwright-core');

const OUT = __dirname;
const A_PATH = 'M1 42 L17 6 L31 6 L47 42 L34.5 42 L24 18.5 L13.5 42 Z';
const TICK   = 'M9.5 31 L17.5 39 L38 18';

const INK   = '#0F1B2E';   // near-black navy
const BLUE  = '#1B54B8';   // brand
const LIFT  = '#5E97DF';   // the tick on dark grounds
const PAPER = '#FFFFFF';

/* ------------------------------------------------------------ SVG masters */
const svgMark = (a, tick) =>
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <path fill-rule="evenodd" fill="${a}" d="${A_PATH}"/>
  <path d="${TICK}" fill="none" stroke="${tick}" stroke-width="6.4"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

/* horizontal lockup: mark, then the wordmark as outlined text so the file
   never depends on Archivo being installed on the viewer's machine */
const svgLockup = (a, tick, edu, att, sub) =>
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 64" width="300" height="64">
  <g transform="translate(0,8) scale(1)">
    <path fill-rule="evenodd" fill="${a}" d="${A_PATH}"/>
    <path d="${TICK}" fill="none" stroke="${tick}" stroke-width="6.4"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="60" y="34" font-family="Archivo, Arial, sans-serif" font-weight="800"
        font-size="30" letter-spacing="-1.1" fill="${edu}">Edu<tspan fill="${att}">Attendance</tspan></text>
  <text x="61" y="50" font-family="Archivo, Arial, sans-serif" font-weight="600"
        font-size="8.4" letter-spacing="2.1" fill="${sub}">SCHOOL ATTENDANCE SYSTEM</text>
</svg>
`;

const SVGS = {
  'svg/mark.svg':              svgMark(INK, BLUE),
  'svg/mark-white.svg':        svgMark('#FFFFFF', LIFT),
  'svg/mark-mono-dark.svg':    svgMark(INK, INK),
  'svg/mark-mono-white.svg':   svgMark('#FFFFFF', '#FFFFFF'),
  'svg/logo-horizontal.svg':       svgLockup(INK, BLUE, INK, BLUE, '#6B7280'),
  'svg/logo-horizontal-white.svg': svgLockup('#FFFFFF', LIFT, '#FFFFFF', LIFT, '#9CA3AF'),
};

/* ------------------------------------------------------------- PNG specs */
// mark occupies ~58% of a square so a circular crop never clips it
const square = (size, bg, a, tick, scale = 0.58) => ({
  w: size, h: size, transparent: bg === null,
  html: `<div style="width:${size}px;height:${size}px;background:${bg || 'transparent'};
           display:flex;align-items:center;justify-content:center">
           <svg width="${Math.round(size * scale)}" height="${Math.round(size * scale)}" viewBox="0 0 48 48">
             <path fill-rule="evenodd" fill="${a}" d="${A_PATH}"/>
             <path d="${TICK}" fill="none" stroke="${tick}" stroke-width="6.4"
                   stroke-linecap="round" stroke-linejoin="round"/>
           </svg></div>`
});

/* Stacked avatar: mark on top, wordmark under it, mark larger.

   Everything sits inside the INSCRIBED CIRCLE, because every platform crops
   avatars round. On a 1000px canvas the circle is still 960px wide at 140px
   above/below centre, so a ~730px wordmark clears it comfortably. */
const stacked = (size, bg, a, tick, edu, att, markScale) => ({
  w: size, h: size, transparent: bg === null,
  html: `<div style="width:${size}px;height:${size}px;background:${bg || 'transparent'};
           display:flex;flex-direction:column;align-items:center;justify-content:center;
           font-family:Archivo,Arial,sans-serif">
      <svg width="${size * (markScale || 0.50)}" height="${size * (markScale || 0.50)}"
           viewBox="0 0 48 48" style="display:block">
        <path fill-rule="evenodd" fill="${a}" d="${A_PATH}"/>
        <path d="${TICK}" fill="none" stroke="${tick}" stroke-width="6.4"
              stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div style="font-weight:800;font-size:${size * 0.088}px;
           letter-spacing:-${size * 0.0032}px;color:${edu};line-height:1;
           white-space:nowrap;margin-top:-${size * 0.028}px">Edu<span style="color:${att}">Attendance</span></div>
    </div>`
});

/* ---- icons, drawn to one stroked style ---------------------------------- */
const ICON = {
  finger: `<path d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z"/><path d="M4 11a8 8 0 0 0 16 0"/><path d="M12 19v3"/>`,
  chart:  `<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>`,
  globe:  `<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>`,
  bell:   `<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8z"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>`,
};
const WA_GLYPH = `<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/>`;

const chip = (k, label, px) => `
  <span style="display:inline-flex;align-items:center;gap:${px*0.5}px;
        padding:${px*0.42}px ${px*0.72}px;border-radius:100px;
        background:rgba(255,255,255,.07);box-shadow:0 0 0 1px rgba(156,192,234,.28) inset;
        font-weight:600;font-size:${px}px;color:#E8EFF8;white-space:nowrap">
    <svg width="${px*1.15}" height="${px*1.15}" viewBox="0 0 24 24" fill="none"
         stroke="${LIFT}" stroke-width="1.9" stroke-linecap="round"
         stroke-linejoin="round">${ICON[k]}</svg>${label}</span>`;

/* a WhatsApp-style alert card - the single most recognisable thing the
   product does, so it earns the visual lead */
/* glyph picks the icon that matches the message: a WhatsApp mark for the
   check-in, an alert bell for the absence, a chart for the report */
const CARD_GLYPH = {
  wa:    `<svg viewBox="0 0 24 24" fill="#fff">${WA_GLYPH}</svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1"
            stroke-linecap="round" stroke-linejoin="round">${ICON.bell}</svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1"
            stroke-linecap="round" stroke-linejoin="round">${ICON.chart}</svg>`,
};

const alertCard = (px, name, line, tone, rot, glyph) => `
  <div style="display:flex;align-items:center;gap:${px*0.62}px;background:#fff;
       border-radius:${px*0.9}px;padding:${px*0.72}px ${px*0.95}px;
       box-shadow:0 ${px*1.1}px ${px*2.4}px -${px*0.9}px rgba(0,0,0,.6);
       transform:rotate(${rot}deg);white-space:nowrap">
    <span style="width:${px*2.1}px;height:${px*2.1}px;border-radius:${px*0.62}px;
          background:${tone};display:flex;align-items:center;justify-content:center;flex:none">
      <span style="width:${px*1.25}px;height:${px*1.25}px;display:block">${CARD_GLYPH[glyph].replace("<svg ", "<svg width=\"100%\" height=\"100%\" ")}</span></span>
    <span>
      <span style="display:block;font-weight:800;font-size:${px*0.98}px;color:#0F1B2E;
            letter-spacing:-.01em">${name}</span>
      <span style="display:block;font-weight:500;font-size:${px*0.82}px;color:#6B7280;
            margin-top:${px*0.14}px">${line}</span></span>
  </div>`;

/* w,h        canvas
   padL       left inset - keeps clear of the overlaid profile picture
   u          type unit; everything scales off it
   showAlerts how many alert cards to stack on the right */
/* ---- shared cover parts ------------------------------------------------- */
const cvBackdrop = (u) => `
  <div style="position:absolute;inset:0;background:
    radial-gradient(60% 130% at 72% 0%, rgba(94,151,223,.26), transparent 62%)"></div>
  <div style="position:absolute;right:-${u*2}px;top:-${u*2}px;width:${u*22}px;height:${u*22}px;
    background-image:radial-gradient(circle, rgba(255,255,255,.16) ${u*0.09}px, transparent ${u*0.1}px);
    background-size:${u*1.1}px ${u*1.1}px;
    -webkit-mask-image:radial-gradient(circle at 50% 50%,#000,transparent 70%)"></div>`;

const cvLockup = (u) => `
  <div style="display:flex;align-items:center;gap:${u*0.72}px">
    <svg width="${u*3.1}" height="${u*3.1}" viewBox="0 0 48 48">
      <path fill-rule="evenodd" fill="#FFFFFF" d="${A_PATH}"/>
      <path d="${TICK}" fill="none" stroke="${LIFT}" stroke-width="6.4"
            stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span style="font-weight:800;font-size:${u*2.15}px;letter-spacing:-${u*0.09}px;
          color:#fff;line-height:1">Edu<span style="color:${LIFT}">Attendance</span></span>
  </div>`;

const cvHeadline = (u, br) => `
  <div style="font-weight:800;font-size:${u*1.42}px;color:#fff;line-height:1.18;
       letter-spacing:-${u*0.045}px">Biometric attendance${br ? '<br>' : ' '}for Pakistani schools</div>`;

const cvChips = (u, wide) => `
  <div style="display:flex;flex-wrap:wrap;gap:${u*0.42}px;max-width:${u*(wide ? 40 : 23)}px">
    ${chip('finger','ZKTeco readers', u*0.78)}
    ${chip('bell','WhatsApp &amp; SMS alerts', u*0.78)}
    ${chip('chart','5 ready reports', u*0.78)}
    ${chip('globe','English &amp; \u0627\u0631\u062f\u0648', u*0.78)}
  </div>`;

const cvContact = (u, align, stack) => stack ? `
  <div style="display:flex;flex-direction:column;align-items:center;gap:${u*0.62}px">
    <span style="display:inline-flex;align-items:center;gap:${u*0.5}px;
          padding:${u*0.38}px ${u*0.92}px;border-radius:100px;
          background:rgba(111,207,151,.13);
          box-shadow:0 0 0 ${u*0.045}px rgba(111,207,151,.42) inset;
          font-weight:800;font-size:${u*0.9}px;color:#6FCF97;white-space:nowrap">
      First month free</span>
    <span style="display:flex;align-items:center;gap:${u*0.62}px;font-weight:700;
          font-size:${u*0.82}px;color:${LIFT};white-space:nowrap">
      <span>www.eduattendance.pk</span>
      <span style="color:rgba(156,192,234,.45)">|</span>
      <span style="color:#CBDDF0">+92 313 3398883</span>
    </span>
  </div>` : `
  <div style="display:flex;align-items:center;justify-content:${align};gap:${u*0.7}px;
       font-weight:700;font-size:${u*0.86}px;color:${LIFT};white-space:nowrap">
    <span>www.eduattendance.pk</span>
    <span style="color:rgba(156,192,234,.45)">|</span>
    <span style="color:#CBDDF0">+92 313 3398883</span>
    <span style="color:rgba(156,192,234,.45)">|</span>
    <span style="color:#6FCF97">First month free</span>
  </div>`;

const cvAlerts = (u, n) => n ? `
  <div style="position:absolute;right:${u*1.9}px;top:50%;transform:translateY(-50%);
       display:flex;flex-direction:column;gap:${u*0.66}px;align-items:flex-end">
    ${alertCard(u*0.92,'Ayesha Khan','Checked in \u00b7 08:12','#25D366', -2.4, 'wa')}
    ${alertCard(u*0.92,'Hamza Raza','Marked absent today','#B23B3B', 2.2, 'alert')}
    ${n > 2 ? alertCard(u*0.92,'Monthly sheet','Ready to print','#1B54B8', -1.6, 'chart') : ''}
  </div>` : '';

/* w,h        canvas
   padL       left inset - keeps clear of the overlaid profile picture
   u          type unit; everything scales off it
   showAlerts how many alert cards to stack on the right */
const richCover = (w, h, padL, u, showAlerts, safeW, safeH) => ({
  w, h, transparent: false,
  html: `<div style="width:${w}px;height:${h}px;background:${INK};position:relative;
           overflow:hidden;font-family:Archivo,Arial,sans-serif">
      ${cvBackdrop(u)}
      <div style="position:absolute;left:${(w - (safeW || w)) / 2}px;
           top:${(h - (safeH || h)) / 2}px;width:${safeW || w}px;height:${safeH || h}px">
        <div style="position:absolute;left:${padL}px;top:50%;transform:translateY(-50%);
             display:flex;flex-direction:column;gap:${u*0.85}px">
          ${cvLockup(u)}
          ${cvHeadline(u, true)}
          ${cvChips(u)}
          ${cvContact(u, 'flex-start')}
        </div>
        ${cvAlerts(u, showAlerts)}
      </div>
    </div>`
});

/* 9:16. A single centred column, alerts underneath rather than beside, so the
   format's height carries the story instead of being dead space. WhatsApp puts
   its own chrome over roughly the top and bottom 250px - the block sits clear
   of both. */
const portraitCover = (w, h, u) => ({
  w, h, transparent: false,
  html: `<div style="width:${w}px;height:${h}px;background:${INK};position:relative;
           overflow:hidden;font-family:Archivo,Arial,sans-serif">
      ${cvBackdrop(u)}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);
           display:flex;flex-direction:column;align-items:center;gap:${u*1.15}px;
           padding:0 ${u*1.2}px;box-sizing:border-box;text-align:center">
        ${cvLockup(u)}
        <div style="font-weight:800;font-size:${u*1.42}px;color:#fff;line-height:1.18;
             letter-spacing:-${u*0.045}px">Biometric attendance<br>for Pakistani schools</div>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:${u*0.42}px;
             max-width:${w - u*2.4}px">
          ${chip('finger','ZKTeco readers', u*0.78)}
          ${chip('bell','WhatsApp &amp; SMS alerts', u*0.78)}
          ${chip('chart','5 ready reports', u*0.78)}
          ${chip('globe','English &amp; \u0627\u0631\u062f\u0648', u*0.78)}
        </div>
        <div style="display:flex;flex-direction:column;gap:${u*0.62}px;
             margin-top:${u*0.35}px">
          ${alertCard(u*0.92,'Ayesha Khan','Checked in \u00b7 08:12','#25D366', -1.8, 'wa')}
          ${alertCard(u*0.92,'Hamza Raza','Marked absent today','#B23B3B', 1.6, 'alert')}
          ${alertCard(u*0.92,'Monthly sheet','Ready to print','#1B54B8', -1.2, 'chart')}
        </div>
        ${cvContact(u, 'center', true)}
      </div>
    </div>`
});

/* The letterbox variant, for LinkedIn's 1128x191 band. Four stacked rows will
   not fit 191px at a readable size, so the content splits into two columns and
   uses the width the format actually gives you. */
const stripCover = (w, h, padL, padR, u) => ({
  w, h, transparent: false,
  html: `<div style="width:${w}px;height:${h}px;background:${INK};position:relative;
           overflow:hidden;font-family:Archivo,Arial,sans-serif">
      ${cvBackdrop(u)}
      <div style="position:absolute;left:${padL}px;right:${padR}px;top:50%;
           transform:translateY(-50%);display:flex;align-items:center;
           justify-content:space-between;gap:${u*2}px">
        <div style="display:flex;flex-direction:column;gap:${u*0.75}px">
          ${cvLockup(u)}
          ${cvHeadline(u, true)}
        </div>
        <div style="display:flex;flex-direction:column;gap:${u*0.7}px;align-items:flex-end">
          ${cvChips(u)}
          ${cvContact(u, 'flex-end')}
        </div>
      </div>
    </div>`
});

const cover = (w, h, markPx, namePx, subPx, gap) => ({
  w, h, transparent: false,
  html: `<div style="width:${w}px;height:${h}px;background:${INK};position:relative;
           display:flex;align-items:center;justify-content:center;gap:${gap}px;
           font-family:Archivo,Arial,sans-serif;overflow:hidden">
      <div style="position:absolute;inset:0;background:
        radial-gradient(70% 120% at 80% 0%, rgba(94,151,223,.22), transparent 60%)"></div>
      <svg width="${markPx}" height="${markPx}" viewBox="0 0 48 48" style="position:relative">
        <path fill-rule="evenodd" fill="#FFFFFF" d="${A_PATH}"/>
        <path d="${TICK}" fill="none" stroke="${LIFT}" stroke-width="6.4"
              stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div style="position:relative">
        <div style="font-weight:800;font-size:${namePx}px;letter-spacing:-${namePx*0.04}px;
             color:#fff;line-height:1">Edu<span style="color:${LIFT}">Attendance</span></div>
        <div style="font-weight:600;font-size:${subPx}px;color:#CBDDF0;margin-top:${subPx*0.6}px;
             letter-spacing:${subPx*0.02}px">Biometric school attendance &middot; WhatsApp alerts to parents</div>
        <div style="font-weight:700;font-size:${subPx*0.95}px;color:${LIFT};margin-top:${subPx*0.5}px">
          www.eduattendance.pk</div>
      </div>
    </div>`
});

const PNGS = {
  // --- square avatars: the one you upload as a profile picture ------------
  'social/profile-navy-1000.png':        square(1000, INK, '#FFFFFF', LIFT),
  'social/profile-navy-512.png':         square(512,  INK, '#FFFFFF', LIFT),
  'social/profile-blue-1000.png':        square(1000, BLUE, '#FFFFFF', '#FFFFFF'),
  'social/profile-white-1000.png':       square(1000, PAPER, INK, BLUE),
  'social/profile-transparent-1000.png': square(1000, null, INK, BLUE),
  // --- stacked: mark over wordmark ----------------------------------------
  'social/stacked-navy-1000.png':        stacked(1000, INK, '#FFFFFF', LIFT, '#FFFFFF', LIFT),
  'social/stacked-navy-512.png':         stacked(512,  INK, '#FFFFFF', LIFT, '#FFFFFF', LIFT),
  'social/stacked-blue-1000.png':        stacked(1000, BLUE, '#FFFFFF', '#FFFFFF', '#FFFFFF', '#CBDDF0'),
  'social/stacked-white-1000.png':       stacked(1000, PAPER, INK, BLUE, INK, BLUE),
  'social/stacked-transparent-1000.png': stacked(1000, null, INK, BLUE, INK, BLUE),
  'social/stacked-whatsapp-640.png':     stacked(640, INK, '#FFFFFF', LIFT, '#FFFFFF', LIFT),
  // --- platform sizes ------------------------------------------------------
  'social/whatsapp-640.png':  square(640, INK, '#FFFFFF', LIFT),
  'social/youtube-800.png':   square(800, INK, '#FFFFFF', LIFT),
  'social/linkedin-400.png':  square(400, INK, '#FFFFFF', LIFT),
  'social/instagram-320.png': square(320, INK, '#FFFFFF', LIFT),
  // --- covers / banners ----------------------------------------------------
  'cover/facebook-cover-820x312.png':   richCover(820, 312, 210, 15.5, 2),
  'cover/linkedin-cover-1128x191.png':  stripCover(1128, 191, 250, 34, 13.5),
  'cover/twitter-header-1500x500.png':  richCover(1500, 500, 110, 27, 3),
  /* 1546x423 is all YouTube shows outside a TV - keep everything inside it */
  'cover/youtube-banner-2048x1152.png': richCover(2048, 1152, 24, 28, 3, 1546, 423),
  'cover/whatsapp-status-1080x1920.png': portraitCover(1080, 1920, 46),
  // --- app + favicons ------------------------------------------------------
  'icons/favicon-16.png':          square(16,  null, INK, BLUE, 0.94),
  'icons/favicon-32.png':          square(32,  null, INK, BLUE, 0.9),
  'icons/favicon-48.png':          square(48,  null, INK, BLUE, 0.9),
  'icons/apple-touch-icon-180.png':square(180, INK, '#FFFFFF', LIFT, 0.62),
  'icons/android-192.png':         square(192, INK, '#FFFFFF', LIFT, 0.62),
  'icons/android-512.png':         square(512, INK, '#FFFFFF', LIFT, 0.62),
};

(async () => {
  for (const dir of ['svg', 'social', 'cover', 'icons']) {
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  }
  for (const [f, body] of Object.entries(SVGS)) {
    fs.writeFileSync(path.join(OUT, f), body);
    console.log('  svg   ' + f);
  }

  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto('data:text/html,<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&display=swap" rel="stylesheet">');
  await page.waitForTimeout(1200);   // let Archivo land before any text render

  for (const [f, spec] of Object.entries(PNGS)) {
    await page.setViewportSize({ width: spec.w, height: spec.h });
    await page.setContent(
      `<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&display=swap" rel="stylesheet">
       <style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:transparent}</style>` +
      spec.html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(OUT, f),
      omitBackground: !!spec.transparent,
      clip: { x: 0, y: 0, width: spec.w, height: spec.h }
    });
    console.log('  png   ' + f + '   ' + spec.w + '×' + spec.h);
  }
  await browser.close();
  console.log('\ndone');
})().catch(e => { console.error(e); process.exit(1); });

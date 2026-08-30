/* ============================================================================
   EduAttendance — 80-second explainer, timeline engine

   The whole film is a pure function of time: seek(t) writes every animated
   property for that instant and nothing carries over between frames. That is
   what lets the offline renderer jump to frame N, screenshot, jump to N+1 and
   get a perfectly stable result — a CSS-transition-driven film cannot do that,
   because it depends on wall-clock playback.

   Preview mode drives seek() from requestAnimationFrame.
   Render mode drives it from render.js via window.__seek(t).
   ========================================================================= */
(function () {
  'use strict';

  var DUR = 42.2;                     // total running time, seconds
  var $  = function (s) { return document.querySelector(s); };
  var el = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------- easing */
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp  = function (a, b, p) { return a + (b - a) * p; };

  var E = {
    lin:  function (p) { return p; },
    out:  function (p) { return 1 - Math.pow(1 - p, 3); },
    out4: function (p) { return 1 - Math.pow(1 - p, 4); },
    in:   function (p) { return p * p * p; },
    io:   function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    back: function (p) { var c = 1.70158, s = c + 1; return 1 + s * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  };

  /* progress of a sub-animation starting at `start` lasting `dur` */
  function seg(t, start, dur, ease) { return (ease || E.out)(clamp((t - start) / dur, 0, 1)); }

  /* write transform + opacity in one go */
  function set(node, o) {
    if (!node) return;
    if (o.o !== undefined) node.style.opacity = o.o;
    var tr = '';
    if (o.x !== undefined || o.y !== undefined) tr += 'translate(' + (o.x || 0) + 'px,' + (o.y || 0) + 'px) ';
    if (o.s !== undefined) tr += 'scale(' + o.s + ') ';
    if (o.r !== undefined) tr += 'rotate(' + o.r + 'deg) ';
    if (tr) node.style.transform = tr;
  }

  /* a number that counts up as p goes 0 -> 1 */
  function count(node, to, p, dec) {
    if (!node) return;
    var v = to * E.out(p);
    node.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
  }

  /* caption lines rise into view, staggered */
  function cap(node, t, start, outAt) {
    if (!node) return;
    /* outAt lets one caption hand over to another inside a single scene */
    var gone = outAt === undefined ? 0 : seg(t, outAt, 0.45, E.out);
    node.style.opacity = 1 - gone;
    var lines = node.querySelectorAll('.l span');
    for (var i = 0; i < lines.length; i++) {
      var p = seg(t, start + i * 0.13, 0.72, E.out);
      set(lines[i], { y: lerp(115, 0, p) - gone * 46, o: p });
    }
  }

  /* ------------------------------------------------- built scene content */
  var ROLL = ['Ayesha Khan', 'Muhammad Bilal', 'Fatima Siddiqui', 'Zainab Ahmed'];

  (function buildRoll() {
    var host = el('s4rows'); if (!host) return;
    ROLL.forEach(function (n, i) {
      var row = document.createElement('div');
      row.className = 's4row';
      row.style.cssText = 'display:flex;align-items:center;gap:22px;padding:22px 0;' +
        (i < ROLL.length - 1 ? 'border-bottom:1px dashed var(--line);' : '');
      row.innerHTML =
        '<span style="width:58px;height:58px;border-radius:50%;background:var(--sky-100);display:grid;' +
        'place-items:center;font-family:var(--display);font-weight:700;font-size:22px;color:var(--brand-700)">' +
        n.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2) + '</span>' +
        '<span style="font-size:29px;font-weight:600;flex:1">' + n + '</span>' +
        '<span class="tag p s4t">Present</span>';
      host.appendChild(row);
    });
  })();

  var DESK_X = [170, 470, 770, 1070], EMPTY = 1;
  (function buildDesks() {
    var host = el('s5desks'); if (!host) return;
    DESK_X.forEach(function (x, i) {
      var d = document.createElement('div');
      d.className = 's5desk';
      d.style.cssText = 'position:absolute;left:' + x + 'px;top:430px;width:240px;height:250px';
      /* The empty desk gets a dashed outline of the child who is not there —
         without it the gap just reads as a spare desk, not an absence. */
      var kid = i === EMPTY
        ? '<g fill="none" stroke="var(--bad)" stroke-width="4" stroke-dasharray="9 9" opacity=".7">' +
          '<circle cx="120" cy="52" r="40"/>' +
          '<rect x="66" y="98" width="108" height="86" rx="30"/></g>'
        :
        '<circle cx="120" cy="52" r="40" fill="#F0C89A"/>' +
        '<path d="M80 38a40 40 0 0 1 80 0z" fill="var(--navy-800)"/>' +
        '<rect x="66" y="98" width="108" height="86" rx="30" fill="var(--brand-' + (500 + (i % 2) * 100) + ')"/>';
      d.innerHTML =
        '<svg width="240" height="250" viewBox="0 0 240 250">' + kid +
        '<rect x="26" y="178" width="188" height="20" rx="8" fill="var(--slate-3)"/>' +
        '<rect x="48" y="198" width="16" height="52" rx="6" fill="var(--line-2)"/>' +
        '<rect x="176" y="198" width="16" height="52" rx="6" fill="var(--line-2)"/></svg>';
      host.appendChild(d);
    });
  })();

  var KPI = [
    { l: 'Students', v: 1248, c: '#93C3FF' },
    { l: 'Present',  v: 1056, c: '#4BE08B' },
    { l: 'Absent',   v: 132,  c: '#FF8A8E' },
    { l: 'Late',     v: 60,   c: '#FFC861' }
  ];
  (function buildTiles() {
    var host = el('s6tiles'); if (!host) return;
    KPI.forEach(function (k, i) {
      var d = document.createElement('div');
      d.className = 's6tile';
      d.style.cssText = 'position:absolute;left:' + (190 + i * 400) + 'px;top:210px;width:360px;height:200px;' +
        'border-radius:24px;background:rgba(255,255,255,.06);box-shadow:0 0 0 1px rgba(146,195,255,.22);padding:32px 34px';
      d.innerHTML =
        '<div style="font-family:var(--mono);font-size:20px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand-300)">' + k.l + '</div>' +
        '<div class="fig s6v" style="font-size:74px;letter-spacing:-.05em;color:' + k.c + ';margin-top:10px;line-height:1">0</div>';
      host.appendChild(d);
    });
  })();

  var BARS = [78, 82, 85, 88, 84, 80], DAYS = ['M', 'T', 'W', 'T', 'F', 'S'];
  (function buildBars() {
    var host = el('s6bars'); if (!host) return;
    BARS.forEach(function (h, i) {
      var b = document.createElement('div');
      b.className = 's6bar';
      b.style.cssText = 'flex:1;height:0;border-radius:12px 12px 4px 4px;position:relative;' +
        'background:linear-gradient(180deg,#5CA4FF,#1657D6)';
      b.innerHTML = '<span style="position:absolute;bottom:-46px;left:0;right:0;text-align:center;' +
        'font-family:var(--mono);font-size:22px;color:var(--brand-300)">' + DAYS[i] + '</span>';
      host.appendChild(b);
    });
  })();

  var SHEETS = [
    { t: 'Monthly sheet',   s: 'Every day, every name' },
    { t: 'Class summary',   s: 'Totals and a rate per student' },
    { t: 'Below threshold', s: 'Worst first, ready to act on' }
  ];
  (function buildSheets() {
    var host = el('s7sheets'); if (!host) return;
    SHEETS.forEach(function (s, i) {
      var d = document.createElement('div');
      d.className = 's7sheet card';
      /* 372px apart, not 250 — at the tighter spacing each sheet buried the
         title of the one behind it. */
      d.style.cssText = 'left:' + (250 + i * 372) + 'px;top:132px;width:560px;height:640px;padding:44px 40px';
      var rows = '';
      for (var r = 0; r < 7; r++) {
        rows += '<div style="display:flex;gap:14px;align-items:center;margin-top:22px">' +
          '<span style="height:14px;border-radius:7px;background:var(--line);width:' + (140 + (r * 37) % 120) + 'px"></span>' +
          '<span style="height:14px;border-radius:7px;background:var(--sky-100);flex:1"></span>' +
          '<span style="width:44px;height:14px;border-radius:7px;background:var(--brand-300)"></span></div>';
      }
      d.innerHTML =
        '<div style="font-family:var(--display);font-weight:800;font-size:40px;letter-spacing:-.03em">' + s.t + '</div>' +
        '<div style="font-size:23px;color:var(--slate-2);margin-top:8px">' + s.s + '</div>' +
        '<div style="height:3px;background:var(--brand-500);width:90px;border-radius:3px;margin-top:26px"></div>' + rows;
      host.appendChild(d);
    });
  })();

  /* pivots for the walk cycle live in the group's own coordinate space */
  ['s1legB','s1legF','s1arm','s2legB','s2legF','s2arm'].forEach(function (id) {
    var n = el(id); if (n) n.style.transformOrigin = '0px 0px';
  });
  var mark = el('s9mark'); if (mark) mark.style.transformOrigin = '75px 75px';

  /* dash setup for the two drawn strokes */
  function dash(node, len) {
    if (!node) return;
    node.style.strokeDasharray = len;
    node.style.strokeDashoffset = len;
  }
  var TICK2 = el('s2tick') ? el('s2tick').getTotalLength() : 60;
  dash(el('s2tick'), TICK2);
  var okg = el('s2ok'); if (okg) okg.style.transformOrigin = '1421px 505px';
  dash(el('s9tick'), 34);
  var ARC = el('s5path');
  var ARC_LEN = ARC ? ARC.getTotalLength() : 0;

  var DONUT = 2 * Math.PI * 40;
  [['s6d1', 84.6, 0], ['s6d2', 10.6, 84.6], ['s6d3', 4.8, 95.2]].forEach(function (d) {
    var n = el(d[0]); if (!n) return;
    n.style.strokeDasharray = DONUT;
    n.style.strokeDashoffset = DONUT;
    n.style.transformOrigin = '50% 50%';
    n.style.transform = 'rotate(' + (d[2] / 100 * 360) + 'deg)';
  });

  /* --------------------------------------------------------------- scenes */
  /* Scene boundaries come from the VOICEOVER, not from a grid. Each is a
     measured silence in the recording, pulled ~0.4s earlier so the picture is
     already on screen when the line that describes it begins. */
  var SCENES = [
    { id: 's1',  a: 0,     b: 4.05  },  // "Every morning ... who's here?"
    { id: 's2',  a: 4.05,  b: 11.35 },  // "With a reader ... present at eight twelve"
    { id: 's3',  a: 11.35, b: 13.95 },  // "and her mother knows before she's sat down"
    { id: 's4',  a: 13.95, b: 18.75 },  // "No device? ... on any screen instead"
    { id: 's5',  a: 18.75, b: 24.65 },  // "when a child doesn't arrive ... never twice"
    { id: 's6',  a: 24.65, b: 27.9  },  // "You see the whole school live, every campus, all day"
    { id: 's7',  a: 27.9,  b: 30.6  },  // "and month end stops being an evening job"
    { id: 's10', a: 30.6,  b: 33.25 },  // "Every role sees only what's theirs"
    { id: 's8',  a: 33.25, b: 36.5  },  // "And every parent reads it in their own language"
    { id: 's9',  a: 36.5,  b: 42.2  }   // "EduAttendance. Book a demo at ..."
  ];
  SCENES.forEach(function (s) { s.node = el(s.id); });

  var FADE = 0.3;

  function seek(t) {
    t = clamp(t, 0, DUR);

    SCENES.forEach(function (s) {
      var vis = t >= s.a - FADE && t <= s.b + 0.02;
      if (!vis) { s.node.style.opacity = 0; s.node.style.visibility = 'hidden'; return; }
      s.node.style.visibility = 'visible';
      s.node.style.opacity = Math.min(clamp((t - s.a) / FADE, 0, 1), clamp((s.b - t) / FADE, 0, 1));
    });

    /* --------------------------------------------- 1 - arriving (0 - 4.05) */
    if (t < 4.05 + FADE) {
      var u = t;
      var raw = clamp(u / 2.5, 0, 1);
      var wp = raw < 0.85 ? raw : 0.85 + (1 - Math.pow(1 - (raw - 0.85) / 0.15, 2)) * 0.15;
      var kx = lerp(-170, 830, wp);
      var ph = kx / 58;
      var settle = clamp((u - 2.5) / 0.4, 0, 1);
      var swing = Math.sin(ph) * (1 - settle);
      set(el('s1kid'),  { x: kx, y: 690 - Math.abs(Math.cos(ph)) * 8 * (1 - settle) });
      set(el('s1legF'), { r: swing * 34 + settle * 5 });
      set(el('s1legB'), { r: -swing * 34 - settle * 7 });
      set(el('s1arm'),  { x: 4, y: -104, r: -swing * 38 });
      set(el('s1cloud1'), { x: -u * 11 });
      set(el('s1cloud2'), { x: u * 7 });
      set(el('s1school'), { o: seg(u, 0, 0.6), y: lerp(26, 0, seg(u, 0, 0.6)) });
      set(el('s1kick'),   { o: seg(u, 0.2, 0.45), x: lerp(-30, 0, seg(u, 0.2, 0.55)) });
    }

    /* ------------------------------------------ 2 - check-in (4.05 - 11.35) */
    /* She walks in under "With a reader at the door, the answer records itself",
       her thumb lands at u=3.6 (7.65s) on "Ayesha touches the pad", and the
       record card slides in at u=5.55 (9.6s) on "marked present at eight twelve". */
    if (t > 4.05 - FADE && t < 11.35 + FADE) {
      var u2 = t - 4.05, DOWN = 3.6;

      var raw2 = clamp(u2 / 2.6, 0, 1);
      var wp2  = raw2 < 0.85 ? raw2 : 0.85 + (1 - Math.pow(1 - (raw2 - 0.85) / 0.15, 2)) * 0.15;
      var kx2  = lerp(690, 1180, wp2);
      var ph2  = kx2 / 58;
      var st2  = clamp((u2 - 2.6) / 0.35, 0, 1);
      var sw2  = Math.sin(ph2) * (1 - st2);
      set(el('s2kid'),  { x: kx2, y: 730 - Math.abs(Math.cos(ph2)) * 8 * (1 - st2) });
      set(el('s2legF'), { r: sw2 * 30 });
      set(el('s2legB'), { r: -sw2 * 30 });

      var reach = seg(u2, 2.7, 0.9, E.io);
      var push  = Math.sin(clamp((u2 - DOWN) / 0.3, 0, 1) * Math.PI) * 4;
      var armR  = u2 < 2.6 ? -sw2 * 30 : lerp(0, -117, reach) - push;
      set(el('s2arm'), { x: 30, y: -150, r: armR });

      var sp = clamp((u2 - DOWN) / 0.62, 0, 2.2);
      set(el('s2scan'), { y: (sp % 1) * 120, o: (u2 > DOWN && u2 < 4.95) ? 1 : 0 });
      set(el('s2fp'),   { o: u2 < DOWN ? 0.75 : clamp(1 - seg(u2, 4.95, 0.3), 0, 1) * 0.9 });

      var okp = seg(u2, 5.0, 0.45, E.back);
      set(el('s2ok'), { o: clamp(okp * 2, 0, 1), s: okp });
      if (el('s2tick')) el('s2tick').style.strokeDashoffset = lerp(TICK2, 0, seg(u2, 5.2, 0.4));
      if (el('s2led'))  el('s2led').setAttribute('fill', u2 < 5.05 ? 'var(--warn)' : 'var(--ok)');

      var st = el('s2state');
      if (st) {
        st.textContent = u2 < DOWN ? 'Place thumb' : u2 < 5.05 ? 'Reading' : 'Verified';
        st.style.color = u2 < 5.05 ? 'var(--brand-600)' : 'var(--ok)';
      }
      var rin = seg(u2, 5.55, 0.65, E.out4);
      set(el('s2rec'), { x: lerp(-620, 0, rin), o: rin });
      set(el('s2kick'), { o: seg(u2, 0.2, 0.45) });
      cap(el('s2capA'), u2, 0.35, 5.0);
      cap(el('s2capB'), u2, 5.4);
    }

    /* ------------------------------------- 3 - parent alert (11.35 - 13.95) */
    if (t > 11.35 - FADE && t < 13.95 + FADE) {
      var u3 = t - 11.35;
      var pin = seg(u3, 0, 0.5, E.out4);
      set(el('s3phone'), { y: lerp(240, 0, pin), o: pin });
      var b1 = seg(u3, 0.5, 0.32, E.back);
      set(el('s3b1'), { s: b1, o: clamp(b1 * 2, 0, 1) });
      var b2 = seg(u3, 1.05, 0.32, E.back);
      set(el('s3b2'), { s: b2, o: clamp(b2 * 2, 0, 1) });
      var sm = seg(u3, 1.55, 0.5, E.out4);
      set(el('s3sms'), { x: lerp(-60, 0, sm), o: sm * 0.96 });
      set(el('s3kick'), { o: seg(u3, 0.15, 0.4) });
      cap(el('s3cap'), u3, 0.35);
    }

    /* --------------------------------------- 4 - manual entry (13.95 - 18.75) */
    /* The tablet lands on "No device?" and the roll ticks over under
       "Your teachers mark the register on any screen instead." */
    if (t > 13.95 - FADE && t < 18.75 + FADE) {
      var u4 = t - 13.95;
      var tin = seg(u4, 0.15, 0.55, E.out4);
      set(el('s4tab'), { x: lerp(320, 0, tin), o: tin });
      var tags = document.querySelectorAll('.s4t'), done = 0;
      for (var i4 = 0; i4 < tags.length; i4++) {
        var tp = seg(u4, 1.9 + i4 * 0.3, 0.28, E.back);
        set(tags[i4], { s: tp, o: clamp(tp * 2, 0, 1) });
        if (tp > 0.5) done++;
      }
      if (el('s4n')) el('s4n').textContent = done;
      [['s4m1', 3.25], ['s4m2', 3.5], ['s4m3', 3.75]].forEach(function (m) {
        var mp = seg(u4, m[1], 0.5, E.out4);
        set(el(m[0]), { x: lerp(-420, 0, mp), o: mp });
      });
      set(el('s4kick'), { o: seg(u4, 0.25, 0.4) });
      cap(el('s4cap'), u4, 0.6);
    }

    /* -------------------------------------------- 5 - absence (18.75 - 24.65) */
    /* Absent tag on "when a child doesn't arrive", the phone card on "the alert
       goes out on its own", and the SENT ONCE stamp lands exactly on "Once,". */
    if (t > 18.75 - FADE && t < 24.65 + FADE) {
      var u5 = t - 18.75;
      var desks = document.querySelectorAll('.s5desk');
      for (var i5 = 0; i5 < desks.length; i5++) {
        var dp = seg(u5, 0.05 + i5 * 0.08, 0.45, E.out4);
        set(desks[i5], { y: lerp(50, 0, dp), o: dp });
      }
      var tg = seg(u5, 0.8, 0.4, E.back);
      set(el('s5tag'), { y: lerp(-60, 0, tg), s: tg, o: clamp(tg * 2, 0, 1) });
      if (ARC) {
        var ap = seg(u5, 2.2, 0.8, E.io);
        ARC.style.strokeDasharray = ARC_LEN;
        ARC.style.strokeDashoffset = lerp(ARC_LEN, 0, ap);
        ARC.style.opacity = ap > 0 ? 0.85 : 0;
      }
      var ph5 = seg(u5, 2.9, 0.5, E.out4);
      set(el('s5phone'), { x: lerp(80, 0, ph5), o: ph5 });
      var stp = seg(u5, 4.3, 0.45, E.back);
      set(el('s5stamp'), { s: lerp(1.5, 1, stp), r: lerp(-14, -7, stp), o: clamp(stp * 2, 0, 1) });
      set(el('s5kick'), { o: seg(u5, 0.2, 0.4) });
      cap(el('s5cap'), u5, 0.5);
    }

    /* ------------------------------------------ 6 - dashboard (24.65 - 27.9) */
    if (t > 24.65 - FADE && t < 27.9 + FADE) {
      var u6 = t - 24.65;
      var tiles = document.querySelectorAll('.s6tile'), vals = document.querySelectorAll('.s6v');
      for (var i6 = 0; i6 < tiles.length; i6++) {
        var kp = seg(u6, 0.15 + i6 * 0.09, 0.5, E.out4);
        set(tiles[i6], { y: lerp(46, 0, kp), o: kp });
        count(vals[i6], KPI[i6].v, seg(u6, 0.3 + i6 * 0.09, 1.1));
      }
      var dn = seg(u6, 0.7, 1.1, E.io);
      [['s6d1', 84.6], ['s6d2', 10.6], ['s6d3', 4.8]].forEach(function (d) {
        var n = el(d[0]); if (n) n.style.strokeDashoffset = DONUT * (1 - (d[1] / 100) * dn);
      });
      set(el('s6donut'), { o: seg(u6, 0.6, 0.45) });
      if (el('s6rate')) el('s6rate').textContent = (84.6 * E.out(seg(u6, 0.8, 1.2))).toFixed(1) + '%';
      var bars = document.querySelectorAll('.s6bar');
      for (var i7 = 0; i7 < bars.length; i7++) {
        var bp = seg(u6, 1.4 + i7 * 0.07, 0.5, E.out4);
        bars[i7].style.height = (BARS[i7] / 100 * 300 * bp) + 'px';
        bars[i7].style.opacity = bp > 0 ? 1 : 0;
      }
      set(el('s6kick'), { o: seg(u6, 0.2, 0.4) });
      cap(el('s6cap'), u6, 0.6);
    }

    /* -------------------------------------------- 7 - reports (27.9 - 30.6) */
    if (t > 27.9 - FADE && t < 30.6 + FADE) {
      var u7 = t - 27.9, sheets = document.querySelectorAll('.s7sheet'), ROT = [-7, 0, 7];
      for (var i8 = 0; i8 < sheets.length; i8++) {
        var sp2 = seg(u7, 0.15 + i8 * 0.35, 0.6, E.out4);
        set(sheets[i8], { y: lerp(480, 0, sp2), r: lerp(ROT[i8] - 10, ROT[i8], sp2), o: sp2 });
      }
      set(el('s7kick'), { o: seg(u7, 0.15, 0.4) });
      cap(el('s7cap'), u7, 0.4);
    }

    /* ---------------------------------------------- 8 - roles (30.6 - 33.25) */
    if (t > 30.6 - FADE && t < 33.25 + FADE) {
      var u10 = t - 30.6, rc = document.querySelectorAll('.s10c');
      for (var i9 = 0; i9 < rc.length; i9++) {
        var rp = seg(u10, 0.15 + i9 * 0.11, 0.55, E.out4);
        set(rc[i9], { y: lerp(64, 0, rp), o: rp });
      }
      set(el('s10kick'), { o: seg(u10, 0.15, 0.4) });
      cap(el('s10cap'), u10, 0.5);
    }

    /* ------------------------------------------ 9 - bilingual (33.25 - 36.5) */
    if (t > 33.25 - FADE && t < 36.5 + FADE) {
      var u8 = t - 33.25;
      var ep = seg(u8, 0.15, 0.55, E.out4);
      set(el('s8en'), { x: lerp(-260, 0, ep), o: ep });
      var swp = seg(u8, 0.6, 0.45, E.back);
      set(el('s8sw'), { s: swp, o: clamp(swp * 2, 0, 1) });
      var up = seg(u8, 0.95, 0.55, E.out4);
      set(el('s8ur'), { x: lerp(260, 0, up), o: up });
      set(el('s8kick'), { o: seg(u8, 0.15, 0.4) });
      cap(el('s8cap'), u8, 0.8);
    }

    /* ---------------------------------------------- 10 - close (36.5 - 42.2) */
    /* The mark lands on "EduAttendance." and the contact strip on
       "Book a demo at eduattendance dot P-K." */
    if (t > 36.5 - FADE) {
      var u9 = t - 36.5;
      var mp2 = seg(u9, 0.25, 0.65, E.back);
      set(el('s9mark'), { s: mp2, o: clamp(mp2 * 2, 0, 1) });
      if (el('s9tick')) el('s9tick').style.strokeDashoffset = lerp(34, 0, seg(u9, 0.75, 0.45));
      var np = seg(u9, 0.7, 0.65, E.out4);
      set(el('s9name'), { y: lerp(40, 0, np), o: np });
      var gp = seg(u9, 1.15, 0.65, E.out4);
      set(el('s9tag'), { y: lerp(30, 0, gp), o: gp });
      var fp = seg(u9, 2.0, 0.75, E.out4);
      set(el('s9foot'), { y: lerp(26, 0, fp), o: fp });
    }
  }

  /* ------------------------------------------------------------- fitting */
  var stage = el('stage');
  function fit() {
    if (document.body.classList.contains('rendering')) return;
    var k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + k + ')';
    stage.style.left = ((window.innerWidth - 1920 * k) / 2) + 'px';
    stage.style.top = ((window.innerHeight - 1080 * k) / 2) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  /* ------------------------------------------------------- preview clock */
  var playing = false, t0 = 0, cur = 0;
  var scrub = el('scrub'), clock = el('clock'), pp = el('pp');

  function show(t) {
    cur = t;
    seek(t);
    if (scrub) scrub.value = t;
    if (clock) clock.textContent = t.toFixed(1) + ' / ' + DUR.toFixed(1);
  }

  function frame(now) {
    if (!playing) return;
    var t = (now - t0) / 1000;
    if (t >= DUR) { t = DUR; playing = false; if (pp) pp.textContent = '▶'; }
    show(t);
    if (playing) requestAnimationFrame(frame);
  }

  if (pp) pp.addEventListener('click', function () {
    playing = !playing;
    pp.textContent = playing ? '❚❚' : '▶';
    if (playing) {
      if (cur >= DUR - 0.05) cur = 0;
      t0 = performance.now() - cur * 1000;
      requestAnimationFrame(frame);
    }
  });
  if (scrub) scrub.addEventListener('input', function () {
    playing = false; if (pp) pp.textContent = '▶';
    show(parseFloat(scrub.value));
  });

  show(0);

  /* --------------------------------------------------- renderer contract */
  window.__DUR = DUR;
  window.__seek = function (t) {
    /* Stop the preview clock first. Without this the rAF loop keeps calling
       show() and overwrites the frame the renderer just asked for, so captured
       frames come out of a completely different scene. */
    playing = false;
    if (pp) pp.textContent = '▶';
    document.body.classList.add('rendering');
    stage.style.transform = 'none';
    stage.style.left = '0px';
    stage.style.top = '0px';
    seek(t);
  };
  /* the renderer waits on this so no frame is captured on fallback fonts */
  window.__ready = false;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    window.__ready = true;
  });
})();

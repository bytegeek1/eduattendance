/* ============================================================================
   EduAttendance — site behaviour

   Everything here is progressive: the page is complete and readable with
   JavaScript switched off. This only adds motion, the mobile menu, the FAQ
   accordion and the animated dashboard figures.
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------ sticky header */
  var head = $('.site-head');
  if (head) {
    var onScroll = function () { head.classList.toggle('stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --------------------------------------------------------- mobile menu */
  var burger = $('.burger'), nav = $('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ------------------------------------------- nav highlight on scroll */
  var navLinks = $$('.nav a[href^="#"]');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  if (sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------------ reveal on view */
  var revealables = $$('.rv');
  if (reduced) {
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var delay = parseInt(en.target.dataset.rvDelay || '0', 10);
        setTimeout(function () { en.target.classList.add('in'); }, delay);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* ------------------------------------------------------------- accordion */
  $$('.q').forEach(function (q) {
    var btn = $('.q-btn', q);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = q.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------------------------------------------------------- count-up */
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var dec = (el.dataset.dec | 0);
    if (reduced) { el.textContent = target.toFixed(dec) + suffix; return; }
    var t0 = null, dur = 1400;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------- charts + meters, on first view */
  function runMock(root) {
    $$('.bars .bar', root).forEach(function (b, i) {
      setTimeout(function () { b.style.height = b.dataset.h + '%'; }, i * 90);
    });
    $$('.meter i', root).forEach(function (m, i) {
      setTimeout(function () { m.style.width = m.dataset.w + '%'; }, 200 + i * 110);
    });
    $$('.stack-band i', root).forEach(function (s, i) {
      setTimeout(function () { s.style.width = s.dataset.w + '%'; }, 250 + i * 120);
    });
    $$('.donut .seg', root).forEach(function (seg) {
      var len = 2 * Math.PI * 40;
      var pct = parseFloat(seg.dataset.pct) / 100;
      var off = parseFloat(seg.dataset.off || '0') / 100;
      seg.style.strokeDasharray = len;
      seg.style.strokeDashoffset = len;
      setTimeout(function () {
        seg.style.strokeDashoffset = len * (1 - pct);
        seg.style.transform = 'rotate(' + (off * 360) + 'deg)';
        seg.style.transformOrigin = '50% 50%';
      }, 300);
    });
    $$('[data-count]', root).forEach(countUp);
  }

  $$('[data-animate]').forEach(function (root) {
    if (!('IntersectionObserver' in window)) { runMock(root); return; }
    var once = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runMock(root);
        obs.disconnect();
      });
    }, { threshold: 0.3 });
    once.observe(root);
  });

  /* ------------------------------------------------ live roll-call ticker */
  var roll = $('#rollcall');
  if (roll && !reduced) {
    var rows = $$('.roll-row', roll);
    var marked = $('#markedCount');
    var cycle = function () {
      rows.forEach(function (r) { $('.tag', r).classList.remove('show'); });
      if (marked) marked.textContent = '0';
      rows.forEach(function (r, i) {
        setTimeout(function () {
          $('.tag', r).classList.add('show');
          if (marked) marked.textContent = String(i + 1);
        }, 500 + i * 620);
      });
    };
    var seen = false;
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !seen) { seen = true; cycle(); setInterval(cycle, 9000); }
      });
    }, { threshold: 0.35 });
    ro.observe(roll);
  } else if (roll) {
    $$('.roll-row .tag', roll).forEach(function (t) { t.classList.add('show'); });
  }

  /* ------------------------------------------- pricing model switch */
  var seg = $('.mswitch');
  if (seg) {
    var tabs = $$('button', seg);
    var ind  = $('.mswitch-ind', seg);

    /* Park the indicator behind whichever tab is selected. Runs on click, on
       load, and on resize — the pill's width changes with the font metrics. */
    function moveIndicator() {
      var active = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
      ind.style.width = active.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + (active.offsetLeft - tabs[0].offsetLeft) + 'px)';
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          var pane = document.getElementById(t.dataset.pane);
          if (pane) pane.classList.toggle('on', on);
        });
        moveIndicator();
      });
    });

    /* Fonts land after first paint and shift the tab widths, so measure again
       once they are ready rather than leaving the pill mis-sized. */
    moveIndicator();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
    window.addEventListener('resize', moveIndicator);
  }

  /* --------------------------------------------------------- year stamp */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

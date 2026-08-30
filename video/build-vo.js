/* ============================================================================
   Lays ten narration clips onto a 44-second bed at their exact scene starts,
   and writes voiceover.mp3 for encode.js to mux in.

     node build-vo.js

   Put the clips in ./vo as line01 … line07 (one per breath-group) (.mp3, .wav, .m4a or .ogg). Missing
   lines are simply skipped, so you can build a partial track while you are
   still recording.

   Delaying each clip rather than concatenating them is what keeps the narration
   locked to the picture: a line that runs a little long eats its own trailing
   silence instead of pushing every later line out of sync.
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

/* one row per breath-group in VOICEOVER.md - a group may span two scenes */
const LINES = [
  { n: 1, at: 0.0,  win: 4.0  },
  { n: 2, at: 4.0,  win: 10.0 },   // spans scenes 2-3
  { n: 3, at: 14.0, win: 4.0  },
  { n: 4, at: 18.0, win: 4.5  },
  { n: 5, at: 22.5, win: 8.5  },   // spans scenes 6-7
  { n: 6, at: 31.0, win: 8.0  },   // spans scenes 8-9
  { n: 7, at: 39.0, win: 5.0  }
];

const DUR = 44;
const VO  = path.join(__dirname, 'vo');
const OUT = path.join(__dirname, 'voiceover.mp3');
const EXT = ['.mp3', '.wav', '.m4a', '.ogg', '.flac'];

function find(n) {
  const base = 'line' + String(n).padStart(2, '0');
  for (const e of EXT) {
    const p = path.join(VO, base + e);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/* ffprobe ships beside ffmpeg-static in some installs and not others, so read
   the duration out of ffmpeg's own stderr instead of depending on it. */
function seconds(file) {
  const r = spawnSync(ffmpeg, ['-i', file], { encoding: 'utf8' });
  const m = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(r.stderr || '');
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null;
}

if (!fs.existsSync(VO)) {
  console.error('No ./vo folder. Create it and add line01 … line10.');
  process.exit(1);
}

const found = [];
for (const l of LINES) {
  const f = find(l.n);
  if (!f) { console.log(`  line ${String(l.n).padStart(2)}  — missing, skipped`); continue; }
  const d = seconds(f);
  const over = d !== null && d > l.win;
  console.log(
    `  line ${String(l.n).padStart(2)}  ${path.basename(f).padEnd(14)}` +
    (d === null ? '' : `${d.toFixed(2)}s / ${l.win.toFixed(1)}s window`) +
    (over ? '   ** OVERRUNS — it will bleed into the next scene' : '')
  );
  found.push({ ...l, file: f });
}

if (!found.length) {
  console.error('\nNothing to build — no clips found in ./vo');
  process.exit(1);
}

/* one adelay per clip, then mix them all onto the same timeline */
const inputs = [];
found.forEach((l) => inputs.push('-i', l.file));

const chains = found
  .map((l, i) => `[${i}]adelay=${Math.round(l.at * 1000)}|${Math.round(l.at * 1000)}[a${i}]`)
  .join(';');
const mix = found.map((_, i) => `[a${i}]`).join('') +
  `amix=inputs=${found.length}:normalize=0:dropout_transition=0[m]`;

const args = [
  '-y', ...inputs,
  '-filter_complex', `${chains};${mix}`,
  '-map', '[m]',
  '-t', String(DUR),
  '-c:a', 'libmp3lame', '-b:a', '192k',
  OUT
];

console.log('\nassembling…');
const r = spawnSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] });
if (r.status !== 0) process.exit(r.status || 1);

console.log(`\ndone — ${OUT}`);
console.log('now run:  node encode.js');

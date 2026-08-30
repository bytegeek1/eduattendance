# EduAttendance — 42-second explainer

A flat-2D animated explainer, built as code rather than generated. 1920 × 1080,
30 fps, 42.2s, with a female voiceover. Same brand blues, type and icon
language as the website.

```
index.html   the stage — nine scenes, all 1920x1080
anim.css     stage styles (no transitions: see below)
anim.js      the timeline — seek(t) draws the frame for time t
render.js    headless Chrome -> ./frames/000000.png …
encode.js    ./frames + voiceover.mp3 -> eduattendance-explainer.mp4
SCRIPT.md    narration, scene by scene, with timings
```

## Watch it / edit it

Open `index.html` (or `http://localhost:5599/video/` with the site's dev server)
and use the transport at the bottom to play and scrub.

## Re-render after a change

```bash
node render.js && node encode.js
```

`render.js` takes about three minutes for the full 2400 frames. To iterate on one
scene, render just that slice:

```bash
node render.js --from 6 --to 16
```

## Why there are no CSS animations

Every animated value is written by `seek(t)` in `anim.js`. Nothing is left to CSS
transitions or `@keyframes`.

That is deliberate. The renderer jumps to an arbitrary time, screenshots, jumps
to the next and screenshots again. A film driven by CSS transitions depends on
wall-clock playback, so those jumps would capture whatever the browser happened
to be mid-way through — frames would tear and stutter. Because `seek(t)` is a
pure function of time, re-running the render produces identical frames.

Two consequences worth knowing if you edit it:

- `window.__seek(t)` pauses the preview clock before drawing, otherwise the
  requestAnimationFrame loop overwrites the frame the renderer just asked for.
- The renderer waits on `window.__ready`, which flips once `document.fonts.ready`
  resolves — so no frame is ever captured on fallback fonts.

## Scene map

Scene boundaries are **derived from the voiceover**, not from a fixed grid. Each
is a measured silence in `voiceover.mp3`, pulled ~0.4s earlier so the picture is
already on screen when the line that describes it begins.

| # | Time | Scene | Lands on |
|---|---|---|---|
| 1 | 0:00-0:04.05 | Outside, she arrives | "Every morning ... who's here?" |
| 2 | 0:04.05-0:11.35 | Inside: thumb on the reader, record lands | "With a reader at the door ... eight twelve" |
| 3 | 0:11.35-0:13.95 | The parent's phone | "her mother knows before she's sat down" |
| 4 | 0:13.95-0:18.75 | Manual entry, the fallback | "No device? ... on any screen instead" |
| 5 | 0:18.75-0:24.65 | The absence, sent once | "when a child doesn't arrive ... never twice" |
| 6 | 0:24.65-0:27.9 | Office dashboard | "You see the whole school live ..." |
| 7 | 0:27.9-0:30.6 | Reports | "month end stops being an evening job" |
| 8 | 0:30.6-0:33.25 | Four roles | "Every role sees only what's theirs" |
| 9 | 0:33.25-0:36.5 | English and Urdu | "every parent reads it in their own language" |
| 10 | 0:36.5-0:42.2 | Logo, phone, domain | "EduAttendance. Book a demo at ..." |

## Re-syncing to a new voiceover

If the narration is re-recorded, **measure it, do not guess**:

```bash
node -e "const{spawnSync}=require('child_process');const ff=require('ffmpeg-static');const r=spawnSync(ff,['-i','voiceover.mp3','-af','silencedetect=noise=-40dB:d=0.16','-f','null','-'],{encoding:'utf8'});console.log(r.stderr.split('\n').filter(l=>l.includes('silence_')).join('\n'))"
```

That prints every pause. Map the phrases onto them by syllable count, then edit
the `SCENES` table at the top of `seek()` in `anim.js` so each scene starts just
before its line, and shift the internal beats to match. The picture moves to fit
the voice, never the other way round.

Ask for roughly a second of silence between narration groups when recording --
clean gaps are what make the boundaries unambiguous.

The walk cycle in scene 1 is driven by **distance travelled**, not by the clock —
that is what keeps the feet from skating when he slows down and stops.

## Voiceover

`encode.js` looks for `voiceover.mp3` beside it and muxes it in automatically.
If the file is not there it encodes a silent MP4 and says so.

Record or generate the narration from `SCRIPT.md`, drop it in as
`voiceover.mp3`, and re-run `node encode.js`. No re-render needed — the frames
are unchanged.

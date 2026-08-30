/* ============================================================================
   Encodes ./frames into an MP4, and muxes voiceover.mp3 in if it exists.

     node encode.js               -> eduattendance-explainer.mp4
     node encode.js --fps 30
     node encode.js --audio vo.mp3

   yuv420p + even dimensions, so the file plays everywhere including WhatsApp,
   PowerPoint and Safari.
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; };

const FPS = arg('fps', '30');
const FRAMES = path.join(__dirname, 'frames', '%06d.png');
const AUDIO = path.join(__dirname, arg('audio', 'voiceover.mp3'));
const OUT = path.join(__dirname, 'eduattendance-explainer.mp4');

if (!fs.existsSync(path.join(__dirname, 'frames', '000000.png'))) {
  console.error('No frames found. Run `node render.js` first.');
  process.exit(1);
}

const hasAudio = fs.existsSync(AUDIO);

const args = ['-y', '-framerate', FPS, '-i', FRAMES];
if (hasAudio) args.push('-i', AUDIO);
args.push(
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
  '-movflags', '+faststart'
);
/* apad before -shortest: the narration is a little shorter than the picture,
   and without the pad -shortest would trim the film to the length of the audio
   and cut the closing logo hold. Padded, -shortest ends on the last frame. */
if (hasAudio) args.push('-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-shortest');
args.push(OUT);

console.log(hasAudio ? 'encoding with voiceover…' : 'encoding (silent — no voiceover.mp3 found)…');
const r = spawnSync(ffmpeg, args, { stdio: ['ignore', 'inherit', 'inherit'] });
if (r.status !== 0) process.exit(r.status || 1);

const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
console.log(`\ndone — ${OUT}  (${mb} MB)`);

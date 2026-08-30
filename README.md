# EduAttendance — marketing website

A single-page marketing site for the School Attendance Management System that
lives in `C:\wamp64\www\eduattendance`. Plain HTML, CSS and JavaScript — no
build step, no framework, no dependencies to install.

```
index.html            the whole page
assets/css/site.css   design system + every component
assets/js/site.js     sticky header, mobile menu, accordion, chart animations
.claude/launch.json   local preview server config
```

## Viewing it

Open `index.html` directly, or serve the folder:

```bash
php -S 127.0.0.1:5599 -t .
```

Then visit <http://localhost:5599>.

## Before it goes live — replace the placeholders

The phone number is live: **+92 313 3398883** (`0313 3398883`), used for both the
`tel:` links and the WhatsApp links (`wa.me/923133398883`, including the floating
button). Change it in one pass with:

```bash
sed -i 's/923133398883/92XXXXXXXXXX/g; s/+92 313 3398883/+92 XXX XXXXXXX/g' index.html
```

The email is live too: **info@eduattendance.pk**, in the top bar, the CTA panel
and the footer.

Still **placeholders** — search and replace across `index.html`:

| Placeholder | Appears | Replace with |
|---|---|---|
| `www.eduattendance.pk` | footer | your domain, if it is not this |
| `Pakistan` | footer | your street address |

The footer domain was set to `www.eduattendance.pk` to match the email. Change it
if the website actually lives somewhere else.

## The product tour video

The 42-second explainer, with voiceover, is embedded on the home page in two
places, both fed by the same file — `video/eduattendance-explainer.mp4`:

- **`#tour` section** (between the trust strip and the stat band). Shows a poster
  frame with a play button; clicking plays it inline.
- **"See how it works"** in the hero opens the same film full-screen in a
  lightbox. Closes on the × button, on a click outside, or with `Esc`.

Neither preloads the video — a 3 MB download has no business being part of first
paint, so `preload="metadata"` on the inline player and `preload="none"` on the
lightbox one.

Two things worth knowing if you touch this:

- Native `controls` are switched **on only once playback starts**. Chrome paints
  the native control bar above overlaying elements, so leaving `controls` on the
  markup made the bar show through the poster.
- Opening the lightbox pauses the inline player and drops its controls again, so
  two copies of the film can never run at once.

The poster is `assets/img/video-poster.jpg`, pulled from the 8.6-second mark. To
regenerate it after re-rendering the video:

```bash
node -e "const{spawnSync}=require('child_process');spawnSync(require('./video/node_modules/ffmpeg-static'),['-y','-ss','8.6','-i','video/eduattendance-explainer.mp4','-frames:v','1','-q:v','3','assets/img/video-poster.jpg'],{stdio:'inherit'})"
```

Everything about building the film itself is in [`video/README.md`](video/README.md).

## Pricing

`#pricing` presents the two commercial models behind a switch, so a visitor
self-selects before they see any number. **Every plan opens with one month free.**

**We run it** (managed — hosted by us, support included). Three tiers, billed
monthly after the free month:

| Plan | Students | Price | Per student |
|---|---|---|---|
| Starter | up to 200 | Rs 5,000 / month | Rs 25 |
| Growth *(featured)* | up to 400 | Rs 10,000 / month | Rs 25 |
| Scale | 600 and above | Rs 20,000 / month | Rs 33 and falling |

Above 600, or several campuses, routes to a custom quote via the bar under the
tiers.

**You run it** (self-managed licence). The price is still **"Request a quote"** —
you have not set one. Edit `#pane-self` in `index.html` when you have.

For context, the Pakistani market in 2026 runs roughly **Rs 15–50 per student per
month**, with published entry plans from about Rs 1,500–3,000/month for small
schools. At Rs 25 per student these tiers sit mid-market, which is a much easier
sell than the Rs 50 they were at before.

**Add-ons** sit below both models: SMS credits and WhatsApp API billed at cost by
whichever provider the school chooses, and the mobile app free on every plan.

## SEO

The site is built to rank for Pakistani school buyers, not for generic
"attendance software" traffic.

**Keyword targets**, taken from what actually ranks rather than guessed:

| Tier | Terms |
|---|---|
| Primary | school attendance software in Pakistan · biometric attendance system for schools in Pakistan · school management software Pakistan |
| Secondary | ZKTeco attendance software · WhatsApp attendance alert to parents · student attendance software Pakistan · school attendance system price in Pakistan |
| Long-tail | how much does school attendance software cost in Pakistan · fingerprint vs RFID for schools · biometric attendance price in PKR · Urdu parent portal |

**What is implemented:**

- Keyworded `<title>` (54 chars) and meta description (155 chars) on every page.
- Canonical URLs, `hreflang="en-pk"`, `geo.region=PK`.
- Open Graph and Twitter cards with the video poster as the share image.
- **JSON-LD** on the home page: `Organization`, `SoftwareApplication` (with all
  three price offers), `VideoObject` for the explainer, and `FAQPage` carrying
  seven questions. The blog carries `BlogPosting`, `BreadcrumbList` and its own
  `FAQPage`.
- `robots.txt` and `sitemap.xml` at the root.
- Hero copy carries the primary keyword in a sentence a human would actually
  read — no stuffing.

**Every FAQ answer in the schema is trimmed from the visible FAQ on the page.**
Do not let those drift apart: Google penalises structured data that says things
the page does not.

**After changing prices, update three places** — the visible `.plan` cards, the
`SoftwareApplication.offers` in the JSON-LD, and the cost answer in both the
visible FAQ and the `FAQPage` schema.

## Blog

```
blog/index.html                                        listing
blog/biometric-attendance-system-schools-pakistan.html 1,615-word guide
```

The guide targets *"biometric attendance system for schools in Pakistan"* — the
highest commercial-intent term in the set. It is written to be genuinely useful
to a principal (fingerprint vs RFID by age group, how WhatsApp and SMS are
actually billed, real PKR costs, seven questions to ask a vendor), because thin
keyword pages do not hold rankings.

To add a post: copy the guide, replace the `<article>`, and update the
`BlogPosting` schema, the card on `blog/index.html`, and `sitemap.xml`.

## What the content is based on

Every claim on the page maps to something the application actually does, so
nothing here overstates the product:

- **Three attendance modes** — `daily` (once a day), `period` (every period) and
  `checkinout` (gate / check in–out), with the per-section override. The legacy
  `gate` value is the same mode with *Require check-out* switched off, and old
  rows saved as `gate` are read as `checkinout` automatically — so the site
  presents three modes, not four.
- **Four roles** — admin, manager (office), teacher, parent. Students have no login.
- **Five reports** — monthly sheet, class summary, absentee list, below
  threshold, register audit.
- **Devices** — ZKTeco readers, multi-device manager, iClock push. No specific
  hardware model is named anywhere on the site.
- **Messaging** — WhatsApp Cloud API; SMS via SendPK, VeeVoTech, Twilio or a
  generic HTTP gateway. The "sent exactly once" claim reflects the unique key on
  (student, date, channel) in `notifications_log`.
- **Bilingual** — English staff screens, full Urdu RTL for parent screens.

The dashboard figures in the mock-ups (1,248 students, 84.6% and so on) are
illustrative sample data, not a customer's real numbers.

## Design system

Defined as custom properties at the top of `site.css`:

- **Colour** — a navy → azure brand ramp (`--brand-600` is the primary) with a
  plum secondary used for the first half of the two-tone headings.
- **Type** — Archivo for display, Source Sans 3 for body, IBM Plex Mono for every
  figure and label. Loaded from Google Fonts.
- **Icons** — all inline SVG, drawn to one 24×24 stroked style. No icon font and
  no third-party icon set, so nothing to load and nothing to license.
- **Depth** — layered surfaces, hairline borders and long blue-tinted shadows
  (`--e1` … `--e4`). No flat blocks, no glossy bevels.

Motion is progressive: the page is complete and readable with JavaScript off,
and every animation is disabled under `prefers-reduced-motion`.

## Adding a page

Copy the `<head>`, top bar, header and footer out of `index.html`. The nav links
are anchors to sections on the home page — change them to `index.html#modes`
style links on any second page.

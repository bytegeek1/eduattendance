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

Contact details are **placeholders**. Search and replace across `index.html`:

| Placeholder | Appears | Replace with |
|---|---|---|
| `+92 300 0000000` | top bar, CTA, footer | your phone number |
| `923000000000` | WhatsApp links (`wa.me/`, float button) | same number, digits only, no `+` |
| `hello@eduattendance.com` | top bar, CTA, footer | your email |
| `www.eduattendance.com` | footer | your domain |
| `Pakistan` | footer | your street address |

There is deliberately **no pricing table** — the FAQ answers "What does it cost?"
by inviting a quote instead. Add a pricing section when the numbers are settled.

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

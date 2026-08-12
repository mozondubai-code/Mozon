# Mozon Broast — 3D Experience Page (`/3d/`)

Scroll-driven 3D page for Mozon Broast (Shop 1, 3 Street, Al Nahda Second, Deira,
Dubai), built with the scroll3d scaffold: Lenis smooth scroll + Three.js r160 (UMD),
zero build step, zero generated assets.

This is an ADDITION to the existing SEO landing site, not a replacement. Nothing in
`website/` was modified — this page lives entirely under `website/3d/` and deploys to
`mozonbroast.ae/3d/`. It links back to the main site and out to
`https://offersmozon.ae` for ordering.

Business facts (address, hours 11AM–2AM, 4.5★ / 145+ reviews, phone) are taken from
this repo's own verified data in `website/index.html`, so NAP stays consistent.

## Plan vs build

| Section (id) | Nav label | Planned technique | Built technique | Notes |
|---|---|---|---|---|
| `hero` | HOME | video-scroll-effect (frame scrub) | video-scroll-effect (frame scrub) | 59 frames of the supplied clip, scrubbed on scroll with `loopBack` (forward over the first half of the section, back over the second) |
| `story` | STORY | hybrid-2d3d (`abstract`) | hybrid-2d3d (`abstract`) | Editorial copy + count-up stats (4.5★ rating, 24h marinade, 145+ reviews); inline idle-rotating torus knot in brand gold |
| `menu` | MENU | hybrid-2d3d (`platter`) | hybrid-2d3d (`platter`) | Six signature items priced from the main site's menu section; stage/copy columns mirrored for rhythm |
| `experience` | EXPLORE | pointer-follow-effect (`abstract`) | pointer-follow-effect (`abstract`) | Cursor-driven golden particle field; static centered pose on touch/reduced-motion, overlay copy still scroll-driven |
| `order` | ORDER | outro (no 3D) | outro (no 3D) | Offers-site CTA, WhatsApp, tel link, address/hours |

No plan deviations. No Higgsfield credits spent — the hero uses the user-supplied
clip, and every other section is real-time WebGL.

## Hero footage

Source: a user-supplied 10.01s / 1280×720 / 24fps clip. Only part of it is usable on
a restaurant site — it opens inside a mock 3D-software UI with garbled text, and ends
on a sci-fi "5D hyper-asset" frame with more garbled text. The clean studio segment
runs roughly 2.70s–5.15s.

- **Window:** 2.70s → 5.15s → 59 frames at native 24fps.
- **Crop:** `crop=1130:616:0:0` removes the garbled "ASSET: 8192 x 4608" overlay along
  the bottom and the AI-tool sparkle watermark bottom-right, keeping the whole
  drumstick. Scaled to 1280 wide, JPEG q6 → 3.4 MB total for the sequence.
- **`loopBack`:** the sequence plays forward across the first half of the section and
  backward across the second, so 2.45s of footage covers the full scroll without a
  visible loop seam.
- **Section height:** 300vh rather than the upstream 500vh — at 500vh, 59 frames
  advance roughly one frame per 8.5vh and the scrub reads as visible stepping.
- **Contrast:** this is a bright studio plate, and the base `.vignette` is tuned for
  dark frames — white overlay copy sat at roughly 1.2:1 against the crust. A
  centre-weighted scrim plus a hard text shadow (`.cinematic .vignette` /
  `.cinematic .reveal-line`) keeps the headline legible across the whole scrub range.

The footage is generic CGI chicken, not Mozon's own food. Swapping in real footage of
the actual product is a drop-in replacement: re-run the same extraction into
`frames/hero/` and update `frameCount`.

## Palette

| Token | Value | Used for |
|---|---|---|
| `--accent` | `#e53935` | Broast red — brand mark, hero glow, menu-section 3D object |
| `--accent-2` / `--gold` | `#ffc107` | Brand gold — stats, prices, nav hover, 3D accents |
| `--bg` | `#0c0605` | Warm near-black page background |
| `--ink` | `#fdf6ee` | Warm off-white text |

Fonts: Bebas Neue (display) + Inter (body).

## Atmosphere layer

Motion language borrowed from the supplied MADAX / Shinobi reference builds, kept
deliberately dim so it never competes with content:

- Ambient ember field (`#embers`, canvas-2D, warm gold, 28–70 particles by viewport area)
- Cursor glow — fine-pointer devices only, hidden on touch and under reduced motion
- Sitewide scroll progress bar pinned to the top of the viewport
- Scroll-spy nav — the active section's link highlights in brand gold

## Files

- `index.html` — page shell, section markup, `*_SECTIONS` registries, library tags
- `styles.css` — scroll3d `base.css` + world/parallax/hybrid fragments + Mozon custom fragment
- `choreography.js` — shared scroll/pointer/color utilities (unmodified scaffold)
- `site.js` — Lenis driver, `.reveal`/`.stat-num` IntersectionObserver, overlay driver for pinned `.world` sections (jobs `video-scroll-effect.js` would own in a scrub build), plus the atmosphere layer above
- `video-scroll-effect.js` — frame-scrub engine (patched, see below)
- `pointer-follow-effect.js`, `hybrid-2d3d.js` — scaffold engines; `hybrid-2d3d.js` carries an added `platter` geometry case
- `frames/hero/` — 59 extracted JPEG frames
- `vendor/` — `three@0.160.0` and `lenis@1.3.21`, vendored from the npm registry so the page has no third-party runtime dependency

## Fixes made to the upstream scaffold

- **Off-centre pinned headlines.** The upstream engines write
  `el.style.transform = translateY(...)` onto `.reveal-line`, which clobbers that
  rule's own `translate(-50%, -50%)` centering — every pinned headline rendered
  pushed right by half its width (measured: box left edge at x=720 in a 1440px
  viewport). Both drivers here write
  `translate(-50%, calc(-50% + Npx))` instead.
- **Hero headline invisible at rest.** A first line with `data-in="0.00"` peaks at
  the midpoint of its window, so it is at opacity 0 at scroll progress 0. The first
  line of each pinned section now opens on a negative `data-in` so it is already
  legible before the visitor scrolls.
- **Mobile nav.** The scaffold hides `.hud-nav` entirely below 700px; this build
  keeps it as a compact horizontally-scrollable row so sections stay reachable.
- **Scroll-spy vs. non-hash nav links.** `document.querySelector()` throws a
  SyntaxError on an href like `../index.html`, which killed the progress bar, cursor
  glow and overlay driver with it. Only `#`-prefixed links are scroll targets now.
- **Two engines, one Lenis.** Upstream, `video-scroll-effect.js` creates the Lenis
  instance and binds the sitewide `.reveal` observer — but `site.js` already owned
  both (earlier builds of this page had no scrub section at all). The engine's copy
  of that block is replaced with the same `hookIntoRaf()` pattern the other engines
  use, so there is one Lenis and counters animate once.

## Verification

Driven in headless Chromium (Playwright) at 1440×900 and 390×844:

- All engines initialize (1 scrub, 1 parallax, 2 hybrids), Lenis active, no page errors
- All 59 frames return 200 and the preloader reaches 100%; canvas pixel signatures
  differ across four scroll positions, confirming the scrub actually advances rather
  than holding one frame
- Scrolled through all five sections — copy, counters, progress bar and scroll-spy all track
- Reduced-motion pass: hero unpins to 100vh, Lenis off, embers/glow hidden, headline
  forced visible, zero console errors

The only console error in local testing is the Google Fonts request, which the
sandbox proxy blocks; it resolves normally in production, and Bebas Neue/Inter fall
back to system fonts if it ever fails.

## Accessibility / degradation

- `prefers-reduced-motion`: sections unpin, static camera poses, first overlay line shown
- Touch devices: pointer section falls back to a static centered pose; hint hidden
- Nav collapses on <700px viewports (per scaffold default)

## Deploy

Static files, same as the rest of `website/`. Upload the whole `3d/` folder into
`public_html/` alongside the existing site — it is then live at
`https://mozonbroast.ae/3d/`. No other file needs to change; add a link to it from
the main page's nav whenever you want it discoverable.

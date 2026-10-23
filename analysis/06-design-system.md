# 06 — Design System

## Colors

| Token | Value | Use |
|---|---|---|
| body bg | `#034102` | deep green |
| lime accent | `#b6fe00` | preloader, wave tape, scrollbar, sound-on |
| deep ink | `#013900` | `--menu-ink`, band text |
| `--menu-paper` | `#f4f3ef` | paper |
| `--ink` / `--tag-ink` | `#16110a` | text |
| `--tag-bg` / `--word-colour` | `#fcd805` | yellow |
| `--nav-face` | `#fff1a2` | |
| `--stage-bg` | `#ff7e00` | |
| `--drop-ink` | `#00000057` | shadows |
| tape palette (CMS) | masking `#fa8005`, double `#50CBFF`, stationery `#FF7B5F`, cloth `#2E3EAC`, opp `#b6fe00`, opp-quiet `#F7D000` | per-product theming via CSS vars |
| tape back colours | masking `#d3c393`, kraft `#dbac80`, black `#2f2f2f`, tissue `#e3e3e3`, clear `#6a6a6a` | peel flap |

## Type

| Role | Font |
|---|---|
| `--font-heading` | **futura-pt-condensed** (Adobe Typekit `wyl5nhy.css`), weight 800, uppercase |
| `--font-body` | **Inter Tight Variable** (next/font) |
| `--font-note` | **Nothing You Could Do** (handwriting, next/font) |

Scale **vw-based from 1440 artboard**: `--h2-size 2.778vw / line 2.431vw / tracking -.083vw` (mobile `5.6/4.9/-.17vw`). Fully fluid, no rem steps.
Misc: `--curve-depth 10.336vw`, `--top-mark-w 9vw` (mobile 18vw), `--roll-size 7vw`.

## Breakpoints

- phone `max-width:743px`
- tablet `744–1279px` (+ orientation variants)
- desktop `≥1280px`
- plus `(hover:hover)` / `(pointer:fine|coarse)` and **29** `prefers-reduced-motion` blocks

## CSS techniques worth stealing

- `@property` registered vars (`--peel`, `--screen`, `--screen-lg`, `--slide-lift`, `--ripple`) → animatable custom props
- CSS trig (`sin()`, `cos()`, `atan2()`, `tan()`) for peel geometry & stroke compensation
- Two-layer `mask-image` for curved section edges (`.arc-cut`, `.arc-foot`, `--section-bite`)
- `mask-image` glyph letters + `mask-position` animation
- `clip-path: inset()` reveals; `clip-path: polygon()` peel
- SVG `<filter>` flood+composite to recolour images
- Paper grain `::before` at .2 opacity everywhere → tactile analog feel
- `.clip{overflow:hidden}` + negative-margin padding so ascenders aren't cut
- `scrollbar-gutter:stable`, `overflow-x:clip`, custom lime scrollbar
- `<noscript><style>` resets transforms/clip-paths → content visible w/o JS
- SSR-rendered hidden states + `data-*="live"` flags → no FOUC

## Art direction

Tactile "stationery desk" collage: cutout photos of real objects (lemon, gift, paper clip, cardboard), tape strips holding things, handwritten notes, perforated paper, sticky notes, curved paper edges, playful SFX. Every interaction references the product (tape) — peel, stick, pull, cut, press.

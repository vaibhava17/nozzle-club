# sweet-tape.com — Teardown

Reverse-engineering of https://sweet-tape.com (home page) to learn how its animations/interactions are built.
Analysis date: 24-10-2026. Read-only static analysis of shipped HTML/CSS/JS — nothing executed.

## Method

Followed the [REA (Reverse Engineer Anything)](https://github.com/morluto/rea) website workflow
(`inspect_web_page` → `analyze_web_bundle`: scripts inventory, chunk edges, vendor fingerprints, source evidence).
REA CLI itself was **not run** (not registered with Claude Code), so steps were done manually:

1. `curl` home HTML + response headers (`x-powered-by: Next.js, Payload`)
2. Extracted all `/_next/static/chunks/*.js|css` (24) + lazily-referenced chunks (6)
3. Vendor fingerprinting via signature strings (`REVISION`, `registerPlugin`, `Lenis`, `matter-js`, `GLTFLoader`…)
4. Pretty-printed app chunks, read module-by-module, correlated with DOM `data-*` attributes + CSS
5. Asset inventory (GLB models, sounds, textures)

To redo with REA proper: `npx rea-agents setup` (select Claude Code), launch Chrome with `--remote-debugging-port=9222`, then
`rea inspect-web-page` + `rea analyze-web-bundle` (see REA `docs/browser-observation.md`).

## Files

| File | Covers |
|---|---|
| [01-stack-and-architecture.md](01-stack-and-architecture.md) | Tech stack, versions, chunk map, asset inventory, page section map |
| [02-shell-preloader-scroll.md](02-shell-preloader-scroll.md) | Lenis+GSAP sync, preloader, route transitions, event bus, cursor, menu |
| [03-scroll-animations.md](03-scroll-animations.md) | Tape peel (CSS), text reveals, parallax, giant horizontal pin, wave textPath, masks, handwriting |
| [04-webgl-3d.md](04-webgl-3d.md) | Three.js hero tape, product viewer, WebGL peel, sticky-note cloth sim, shader patches |
| [05-sound-and-physics.md](05-sound-and-physics.md) | Web Audio system, Matter.js footer ball pit |
| [06-design-system.md](06-design-system.md) | Colors, fonts, type scale, breakpoints, CSS tricks |
| [07-recreate-playbook.md](07-recreate-playbook.md) | How to rebuild each effect + project ideas |

## TL;DR

- **Next.js 16 (App Router, Turbopack) + Payload CMS**, React 19
- **GSAP 3.15** (ScrollTrigger, Flip, Observer) + **Lenis 1.3.25** smooth scroll
- **Three.js r185** vanilla (no R3F), lazy-loaded; custom `onBeforeCompile` "glass film" shader; procedural canvas noise textures
- **Matter.js** physics ball pit in footer, lazy-loaded
- **Web Audio API** SFX for every interaction (off by default)
- No framer-motion, no View Transitions API, no postprocessing — mostly handcrafted GSAP + CSS custom properties (`@property`)
- Signature trick: **"tape peel"** = CSS `clip-path` + mirrored flap + SVG flood filter, driven by one animatable `--peel` number
- Everything respects `prefers-reduced-motion` (29 CSS blocks + early-return in every JS init)

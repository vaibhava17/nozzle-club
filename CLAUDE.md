# CLAUDE.md

Learning workspace for interactive / animated web techniques.

## Contents

- `analysis/` — reverse-engineering teardown of https://sweet-tape.com (Next.js 16 + GSAP + Lenis + Three.js + Matter.js). Start at `analysis/README.md`.
- `index.html` + `css/` + `js/` + `assets/` — "Nozzle Club" demo: single-page 3D-printed keychain shop (plain HTML + ES modules, three r185 / gsap / lenis via CDN import map, no build). Live print hero, pegboard shop, custom designer w/ STL export. Moved to repo root (24 Oct 2026) so it serves directly from GitHub Pages at the repo's root URL. Run: `python3 -m http.server 5173` from repo root. See `KEYCHAIN_STORE_README.md`.

## keychain-store notes

- No bundler/npm — deps pinned in `index.html` import map; keep versions in sync if bumping
- All keychain geometry procedural in `js/lib/keychain.js` (SHAPES, FIGURES, PRODUCTS, PRESETS); add figures there + icon in `js/lib/icons.js`
- Print look = one shared `onBeforeCompile` patch (`printMaterial`); uniforms `uPrint/uHot/uGlow` per keychain, call `kc.sync()` every frame before render
- Shop uses one fixed scissored canvas for all tiles — don't add per-tile WebGL contexts
- Verify visually via headless Chrome screenshots (separate `--user-data-dir`), never the user's own browser session

## Purpose

Study award-style sites, document how effects are built, then rebuild them from scratch here. Analysis docs are reference — rebuilds must be original code, not copied site source/assets (fonts, GLBs, sounds, images belong to their owners).

## Conventions

- Teardown docs: one folder per site under `analysis/` (or `analysis/<site>/` going forward), numbered md files, evidence-first (chunk/module names, exact constants)
- Static analysis only — never execute downloaded site JS
- Rebuild stack default: Next.js App Router, GSAP + ScrollTrigger, Lenis, vanilla three.js, matter-js
- Animation rules: single `gsap.ticker` RAF, IO-pause off-screen, `prefers-reduced-motion` early-return + static CSS end state, lazy-load heavy libs, frame-rate-independent smoothing `1 - Math.exp(-k*dt)`

## Tools

- REA (`npx rea-agents`) v6.7.0 available via npx cache; not yet registered with Claude Code (`npx rea-agents setup` → select Claude Code). Website analysis needs Chrome w/ `--remote-debugging-port=9222`.

## Next.js projects (when added)

- `npm run lint` before + after changes; never `npm run build`

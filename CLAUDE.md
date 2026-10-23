# CLAUDE.md

Learning workspace for interactive / animated web techniques.

## Contents

- `analysis/` — reverse-engineering teardown of https://sweet-tape.com (Next.js 16 + GSAP + Lenis + Three.js + Matter.js). Start at `analysis/README.md`.

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

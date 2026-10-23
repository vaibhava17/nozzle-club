# 07 — Recreate Playbook

## Recommended stack

```
next@16 (App Router) · react@19 · gsap@3.15 (+ScrollTrigger) · lenis@1.3 · three@0.185 · matter-js
```
Optional: `@gsap/react` (`useGSAP`) for cleanup. Avoid R3F unless needed — the site gets away with vanilla three + dirty-flag render.

## Architecture rules (copied from site)

1. One RAF: `gsap.ticker` drives Lenis, scroll-mapped effects, three renders, physics
2. Imperative `initX(el)` modules called in `useEffect`, return cleanup (AbortController + `kill()` + `dispose()`)
3. SSR hidden states + `data-*="live"` flag + `<noscript>` reset
4. Event bus `hold / startSweep / release`; gate every intro on `whenRevealed`
5. Lazy-import three/matter; show `<img>` until ready
6. IntersectionObserver pause everything off-screen
7. `prefers-reduced-motion` → early return + static CSS end state
8. Frame-rate-independent smoothing: `v += (t - v) * (1 - Math.exp(-k*dt))`

## Build order (easy → hard)

| # | Effect | Difficulty | Key tech | Ref |
|---|---|---|---|---|
| 1 | Lenis + GSAP ticker sync | ★ | Lenis, ScrollTrigger.update | 02 |
| 2 | Shuffled char reveal | ★ | split → `.clip>.char`, Fisher–Yates, `yPercent 130→0` | 03 §2 |
| 3 | Ticker parallax | ★ | exp lerp, half-px quantize | 03 §4 |
| 4 | Curved section edges + paper grain | ★ | 2-layer mask-image, `::before` overlay | 06 |
| 5 | Preloader stack sweep + route cover | ★★ | stacked `.arc-cut` layers, golden-ratio stagger, capture click | 02 |
| 6 | Custom cursor + sound system | ★★ | quickSetter, Web Audio buffer cache | 02, 05 |
| 7 | CSS tape peel | ★★ | `@property --peel`, clip-path polygon, mirrored flap, SVG flood filter | 03 §1 |
| 8 | Wave textPath marquee | ★★ | `getSubStringLength`, `attr:{startOffset}`, timeScale from scroll Δ | 03 §6 |
| 9 | Handwriting note | ★★ | visibility stepping + SVG rule scale | 03 §3 |
| 10 | Giant pinned camera journey | ★★★ | stops → path, pin+scrub .6, `end:'+='+pathLength` | 03 §5 |
| 11 | Matter.js DOM ball pit | ★★★ | vw units, Constraint drag, collision SFX | 05 |
| 12 | Sticky note cloth | ★★★ | CPU vertex deform, VSM shadow, canvas texture | 04 §4 |
| 13 | WebGL letter peel | ★★★★ | DOM→canvas→plane, cylinder wrap deform | 04 §3 |
| 14 | Hero tape unroll | ★★★★ | GLB + procedural strip, fBm torn edge, Fresnel-alpha shader patch | 04 §1 |

## Snippets

### Lenis + GSAP
```js
const lenis = new Lenis({ duration: 1.8 })
gsap.ticker.add(t => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)
lenis.on('scroll', ScrollTrigger.update)
```

### Shuffled char reveal
```js
const chars = gsap.utils.shuffle([...el.querySelectorAll('.char')])
gsap.fromTo(chars, { yPercent: 130 }, { yPercent: 0, duration: .6, stagger: .025, ease: 'power3.out',
  scrollTrigger: { trigger: el, start: 'top 75%', once: true } })
```

### CSS peel core
```css
@property --peel { syntax: "<number>"; inherits: true; initial-value: 0; }
.peel { --cut: calc(var(--from) + var(--peel) * (var(--to) - var(--from))); position: relative; }
.peel-face { clip-path: polygon(0 var(--cut), 100% var(--cut), 100% 100%, 0 100%); }
.peel-flap { position: absolute; inset: 0; top: calc(-100% + 2 * var(--cut));
  transform: scaleY(-1); clip-path: polygon(0 0, 100% 0, 100% var(--cut), 0 var(--cut));
  filter: url(#tape-back) brightness(calc(1 + var(--peel) * .22)); }
```
```html
<svg width="0" height="0"><filter id="tape-back"><feFlood flood-color="#d3c393"/><feComposite in2="SourceAlpha" operator="in"/></filter></svg>
```

### Text on path loop
```js
const period = text.getSubStringLength(0, phrase.length)
const tw = gsap.fromTo(textPath, { attr: { startOffset: 0 } },
  { attr: { startOffset: -period }, duration: period / 120, ease: 'none', repeat: -1 })
lenis.on('scroll', ({ velocity }) => tw.timeScale(gsap.utils.clamp(-4, 5, .9 + .5 * velocity)))
```

### Fresnel "glass film" patch
```js
mat.onBeforeCompile = s => {
  Object.assign(s.uniforms, { uClarity: { value: .68 }, uEdge: { value: 3.2 } })
  s.fragmentShader = 'uniform float uClarity; uniform float uEdge;\n' + s.fragmentShader.replace(
    '#include <opaque_fragment>',
    `float ndv = abs(dot(normal, normalize(vViewPosition)));
     diffuseColor.a = mix(1. - uClarity, 1., pow(1. - ndv, uEdge));
     #include <opaque_fragment>`)
}
mat.transparent = true; mat.depthWrite = false
```

## Project ideas using these techniques

- **Stationery portfolio** — projects as taped polaroids that peel on scroll, handwritten captions
- **Product launch page** — GLB product turntable + pinned diagonal journey through features
- **Interactive résumé** — sticky notes that flutter with scroll speed, ball-pit skills in footer
- **Recipe/food site** — wave textPath band of ingredients, letter-poke headings, SFX on interactions
- **Music/event page** — Web Audio BGM + collision sounds, preloader sticker unfold w/ band logo

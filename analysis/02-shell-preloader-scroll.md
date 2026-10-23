# 02 — Shell: Smooth Scroll, Preloader, Transitions, Cursor, Menu

Source: `2s0u9hio1067v.js`, `337eeiph6mwz7.js`.

## Lenis + GSAP ticker

```js
initViewport();
ScrollTrigger.config({ ignoreMobileResize: true });
if (reducedMotion) return;                       // native scroll
const lenis = new Lenis({ duration: 1.8 });      // default expo-out: t => min(1, 1.001 - 2**(-10t))
gsap.ticker.add(t => lenis.raf(t * 1000));       // single RAF for everything
lenis.on('scroll', ScrollTrigger.update);
whenRevealed(() => {
  gsap.delayedCall(2, () => gsap.ticker.lagSmoothing(0));
  ScrollTrigger.refresh();
});
// cleanup: lagSmoothing(500,33); lenis.destroy()
export const resetScroll = () => lenis ? lenis.scrollTo(0,{immediate:true,force:true}) : scrollTo(0,0);
```

lagSmoothing per phase: preloader `(250,120)`, page cover `(120,33)`, after reveal `0`.

## Event bus (gates all intros)

`<html data-loading>` rendered in SSR → CSS hides overflow & parks UI offscreen.

```js
hold()       { swept=false; html.dataset.loading=''; dispatch('sweettape:holding') }
startSweep() { swept=true;  dispatch('sweettape:sweeping') }
release()    { delete html.dataset.loading; dispatch('sweettape:revealed') }
whenRevealed(cb)  // now, or once on 'revealed'
whenSweeping(cb)  // now, or once on 'sweeping'
onHold(cb)
```

Every entrance animation wrapped in `whenRevealed`/`whenSweeping` → nothing animates under the loader.

## Viewport utils

- Coarse-pointer devices freeze `--screen` / `--screen-lg` as px (defaults `100svh`/`100lvh`, `@property <length>`) → no URL-bar jump
- Subscribers notified only on width change (or height Δ>1px on fine pointers)
- `observeWidth` = ResizeObserver w/ rounded width

## Preloader

DOM: `.site-preloader` (fixed, z 500) → one `.preloader-layer.arc-cut[data-tape]` per tape colour (stationery, masking, opp-quiet, opp, double, cloth) stacked; top `.preloader-sheet.arc-cut` (`#b6fe00`). Bottom edges curved via CSS mask.

**Sticker "unfold"** (`.preloader-mark`): JS slices SVG logo into **64 vertical strips** (`.preloader-col`), each w/ ink (bg-position slice), sheen gradient (masked), back face (`#60a000`). Per tick each strip angle:

```
θ(r) = bend*(r-.5) + fold*smoothstep(crease ≈ .31±.09) + wave*sin(2π(1.95r - phase))
```

Angles integrated into x/z → `translate3d(dx,0,dz) rotateY(-θ)` + `brightness(1-.48(1-cosθ))` + back-face swap → fake paper bending in pure DOM/CSS 3D.
Consts: `SCALE .62, TILT -78°, BEND 1.85, FOLD 1, WAVE .35, UNROLL .74, REBOUND{DEPTH .72,DUR .4}, SETTLE 2 elastic.out(1,.42)`; perspective `6.6*width`, origin `50% 25%`.

**Exit sweep**: layers `yPercent:-100`, `power3.inOut`, dur `1.05*(1+i*.018)`, stagger `.09*(1+spread*goldenRatioJitter)`. On last layer: `startSweep()` @33%, `release()` @55%.

## Route transitions (no View Transitions API)

Capture-phase click listener on same-origin `<a>` (skip `data-no-transition`, modifier keys, download):

1. `hold()`
2. layers come back down reversed (`at .2, step .055, dur .8`); on `/products/:slug` all layers = that tape's colour
3. `router.push(url,{scroll:false})`
4. await pathname change + cover end (6s fallback)
5. `resetScroll()` → `ScrollTrigger.refresh()` → sweep up → `release()`

## Custom cursor

- Only `(pointer: fine)`; `html.has-cursor *{cursor:none}` + fixed `div.cursor-arrow`
- `gsap.quickSetter` x/y on ticker
- Sprites w/ hotspot via CSS translate: arrow `new-cursor.svg` 48×52 (11.2,12), pointer `cursor-pointer.svg` (13.3,6.3), type `cursor-type.svg` (12.8,20.4)
- Targets `a,button,[role=button],input,select,textarea,label,summary,[data-cursor]`; hover scale 1.18 + rot 7°→-1°, press .86 (.28s power3.out); drop-shadow `0 1px 1.5px #00000073`

## Menu — "PULL ME" tab

- Paper tab w/ zig-zag tooth mask + perforation line (repeating-linear-gradient)
- Open: desktop panel `height 0→auto` + sheet `yPercent -100→0`; mobile `width 0→sheetWidth`; `back.out(1.9)` .7s
- Items at `.28 + .16*i`: rule `clip-path inset(0 100% 0 0)→inset(0)`, shuffled chars rise, arrow `scale 0→1 back.out(2.2)`
- Close: `tweenTo(0,{.85s power2.inOut})` + sound; Esc + outside click
- Tab arrival after reveal: from `yPercent -115` (mobile xPercent 115), `back.out(1.9)` .75s delay .7
- Hover sound only if pointer moved >12px from click point
- **Sound pill**: bottom-right, ball img slides `left 23%↔77%` `cubic-bezier(.22,1,.36,1)`, bg → lime when on

## Top band (non-home pages)

`.top-note` "STICK WITH YOU THROUGH / THREE GENERATIONS" clip reveal + shuffled chars; `.top-mark` logo drops from `yPercent -260` (.85s, delay .45, `back.out(1.4)`).

## Payload live preview

```js
(opener||parent).postMessage({type:'payload-live-preview',ready:true}, origin)
// on message type==='payload-document-event' → router.refresh()
```

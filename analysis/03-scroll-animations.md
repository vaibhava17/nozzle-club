# 03 — Scroll & DOM Animations

Source: `1bevjk_zfpi8k.js`, `12brgdlqixjgb.js`, `09lfiv_61siim.js`, `449pt6kwqbcu2.js`, `337eeiph6mwz7.js`, `215e8972oexyg.js` + CSS.

Key observation: **many scroll effects don't use ScrollTrigger** — hand-rolled `gsap.ticker` callbacks map `scrollY → progress`, gated by IntersectionObserver. ScrollTrigger used for `once` reveals + the one big pin.

## 1. Tape peel (CSS) — the signature effect

```html
<span class="peel" data-peel="scroll|loop|manual" data-peel-in data-peel-out data-peel-every data-peel-delay
  style="--peel-w;--peel-h;--peel-dir:90deg;
         --peel-from:calc(var(--peel-edge) + .55*var(--peel-span));
         --peel-to:calc(var(--peel-edge) + 0*var(--peel-span));
         --peel-back:url(#peel-back-masking)">
  <span class="peel-face"><span class="peel-turn"><img></span></span>
  <span class="peel-flap" aria-hidden><span class="peel-turn"><img></span></span>
</span>
```

How:
- `@property --peel { syntax:"<number>"; inherits:true; initial-value:0 }` → animatable
- `.peel` rotated by `--peel-dir`, `.peel-turn` counter-rotates img → cut always horizontal in local space
- `--peel-span = w·|sin dir| + h·|cos dir|` (CSS trig, `max(sin,-sin)` as abs)
- `--peel-cut = from + --peel·(to − from)`
- `.peel-face`: `clip-path: polygon()` keeps part **below** cut
- `.peel-flap`: duplicate img, `scaleY(-1)`, `top: calc(-100% + 2*cut - 1px)` (mirror about cut), clipped **above** cut → lifted flap folded back
- flap `filter: var(--peel-back) brightness(1 + --peel*.22)`; SVG filter = `feFlood(color)` + `feComposite in=SourceAlpha` → recolours silhouette to tape-back colour (masking `#d3c393`, kraft `#dbac80`, black `#2f2f2f`, tissue `#e3e3e3`, clear `#6a6a6a`, mark `#60a000`)

Modes (`initPeel`):
- **loop**: timeline `{repeat:-1, repeatDelay: every??3.4, delay: delay??1.3*i}` → `p 0→1` .5s power2.out, hold .9, `1→0` .8s power3.inOut; IO (`15% 0px`) play/pause
- **scroll** (ticker, not ST):
  ```js
  from = docTop(el) - screenH*(peelIn ?? .92)
  to   = docTop(el) + el.offsetHeight/2 - screenH*(peelOut ?? .46)
  p = power1.inOut(clamp01((scrollY-from)/(to-from)))
  if (Math.abs(p-last) > .001) el.style.setProperty('--peel', round3(p))
  ```
- **manual**: parent tweens it (slider: .62s power2.out stagger .26; giant: delay .3, .75s power2.inOut)

## 2. Text reveals

`REVEAL = {HIDDEN:130 (yPercent), DURATION:.6, STAGGER:.025, DELAY:.3, EASE:'power3.out'}`

- SSR markup `.clip{overflow:hidden} > .char{transform:translateY(130%)}`; JS sets `data-reveal="live"`; `<noscript>` resets → no-JS safe
- **Chars Fisher–Yates shuffled before stagger** → random "popcorn" letter rise
- `initStickReveal`: `ScrollTrigger{start:'top 75%', once}`, stagger .02
- `initChipFlip`: `rotateY -100→0, transformPerspective 420, autoAlpha 0→1, .85s back.out(1.4)`, `start:'top 88%', once`
- `initBodyReveal`: words in `.body-clip > .body-rise` (yPercent 110); on enter groups words into **visual lines by offsetTop**, each line `.72s power3.out` delay `i*.09`
- `initCopyReveal` (hero cardboard h2): scroll-scrubbed via ticker; char placed at `(lineTop-minTop)/range + .35*random`; progress `(scrollY - (top - .9vh))/(h + .2vh)`, **monotonic**, self-removes at 1
- `initCornerMark`: `clip-path inset(0 0 100% 0)→inset(0)` .5s then chars

## 3. Handwritten note

DOM: `.hand-note > .sr-only text + .hand-ink[aria-hidden] > svg.hand-rule--x + svg.hand-rule--y + span.hand-line×N`; font "Nothing You Could Do", rotated 353°.

```js
DRAW = {RULE:.75, LIFT:.14, CHAR:.06, BREAK:.18}
tl.fromTo(ruleX,{scaleX:0},{scaleX:1, duration:RULE*wx/(wx+hy), ease:'none'})
  .fromTo(ruleY,{scaleY:0},{scaleY:1, duration:RULE*hy/(wx+hy), ease:'none'})  // L-shape as one stroke
t = tl.duration() + LIFT
lines.forEach((chars,i)=>{ if(i) t+=BREAK; chars.forEach(c=>{ tl.set(c,{visibility:'visible'},t); t+=CHAR }) })
```
- IO (`0 0 -22% 0`): play on enter, `pause(0)` on leave → rewrites every visit
- CSS trick: stroke width `calc(10*tan(atan2(--note-rule, --note-bow)))` turns length ratio into unitless number → constant stroke w/ `preserveAspectRatio=none`
- `park(path)` / `write()` helpers = classic dasharray/dashoffset line draw

## 4. Parallax (ticker, frame-rate independent)

```js
// [data-parallax="-0.12"][data-parallax-ease="9"]
target = (scrollY + screenH/2 - centre) * factor
y += (target - y) * (1 - Math.exp(-ease*dt))
el.style.transform = `translate3d(0,${Math.round(y*2)/2}px,0)`   // half-px quantize
```
- `initStickParallax`: img taller than box by `2*--stick-drift(5%)`, writes `--stick-pan`
- `initGiantParallax`: `gsap.quickSetter(el,'--pdx')` + `--prot` (`-8·s deg`) from horizontal screen position; CSS composes `translate: var(--pdx); rotate: calc(var(--pr) + var(--prot))`

## 5. Giant pinning — scrubbed camera journey

- `section.giant-pinning > .wrapper(height:--screen-lg; overflow:hidden) > .giant-canvas(abs)`; children at `left:var(--gx); top:var(--gy)` in **vw** (e.g. `--gx:215vw; --gy:95vw`), mobile overrides
- Path builder: per `.giant-row` camera stops (centre if fits, else left→right edge); title stop first; corners >70° rounded w/ quadratic Bézier (5 samples)
- Linear timeline, segment duration ∝ length; `tl.call()` at each stop fires that row's reveals/peels/arrow draw

```js
ScrollTrigger.create({
  trigger: wrapper, start: 'top top',
  end: () => '+=' + Math.round(pathLength * (tl.duration()/(N-1))),  // 1 scroll px ≈ 1 canvas px
  pin: wrapper, pinSpacing: true, scrub: .6, invalidateOnRefresh: true,
  animation: tl,
});
```
- Arrows: dashoffset draw .9s power2.inOut, head at .9 for .3s

## 6. Wave band — text running along a tape

```html
<svg viewBox="-80 60 1760 540" preserveAspectRatio="xMidYMid slice">
  <defs><path id="wave-band-path" d="M-3200,330 Q…"/>   <!-- long sine: ±130 amp, 800 period -->
        <pattern id="wave-band-grain">paper-overlay.webp</pattern></defs>
  <use href="#wave-band-path" class="band-tape"/>       <!-- stroke 190px #b6fe00 = the tape -->
  <use href="#wave-band-path" class="band-tape-grain"/> <!-- grain stroke opacity .2 -->
  <text class="band-text" dy=".35em"><textPath href="#wave-band-path" startOffset>…</textPath></text>
  <image class="band-badge"/>…
</svg>
```
- after `document.fonts.ready`: `period = text.getSubStringLength(0, head+6sp+tail+3sp)`
- seamless loop: `gsap.fromTo(textPath,{attr:{startOffset:l}},{attr:{startOffset:l-period}, duration:period/120, ease:'none', repeat:-1})`
- badges in gaps: `getPointAtLength(pos)` + tangent (±8) → `translate() rotate(atan2)`
- **scroll-reactive**: `target = clamp(-4,5)(.9 + .5·Δscroll)` → `tween.timeScale()`; scroll up reverses text
- IO `600px 0px` pauses; reduced motion = static offset; text 155px weight 800 `#013900`

## 7. Masking tricks

- **Curved section edges**: `mask-image: linear-gradient(#000 0 0), var(--section-curve /* SVG arc data-URI */)`; `mask-size: 100% calc(100% - arc-h + 1px), 100% arc-h`; positions `0 0, 0 100%`
- **Glyph word swap** (slider "THE CREATIVE"): `img{content:url(1x1.svg); background-color:var(--word-colour); mask-image:var(--glyph)}`; `maskDip(el,y)` animates `mask-position: 0 ${y}px` → letter sinks out of its own box, colour swap, rises back (.32s power2.in / .42s power3.out, stagger .08)
- **Slider bg wipe**: arc-edged next layer translates in .85s power2.out; text recolour timed to when arc crosses each element via sampled ease inverse
- **Paper grain**: `::before{background:url(paper-overlay.webp); opacity:.2; pointer-events:none}` on `[data-paper]`

## 8. Tape slider

- Buttons on ring: `x = cos((i*360/n + rot)°)*r`; rotate ring .85s sine.inOut
- Button `data-*` drives everything: `data-word`, `data-showcase="a.webp|b.webp"`, `data-strip="src|filter|w|h|blend"`, `data-tags`, `data-copy`, `data-card`, `data-model` (GLB), CSS vars `--ring --bg --word --tag-bg --ink`
- Showcase cards flip: `transformPerspective 900`, `rotationY→90, z:-55` .39s power2.in → swap → `-90→0` .39s power2.out, stagger .26
- 3D model swap = fake flip: `spin 0→90` .45s → `show(next)` → `-90→0` .45s
- Intro once via IO `rootMargin "0px 0px -45% 0px"`

## 9. Footer letter poke

Chars near cursor (radius `.8*fontSize`, smoothstep falloff) lift `-.08em`, rotate ≤-11° by side, scale 1.08 (.45s power3.out, origin bottom); leave → `elastic.out(1,.45)` .9s stagger from centre. Footer links: `start:'top 80%', once`, shuffled chars stagger .014.

## Reduced motion / mobile

- Every `init*` early-returns on `(prefers-reduced-motion: reduce)`; CSS gives static end states (`.peel{--peel:0}`, chars `transform:none`, giant section unpins)
- Breakpoints: phone `≤743px`, tablet `744–1279px`, desktop `≥1280px`
- Pointer effects only when `(hover:hover)`

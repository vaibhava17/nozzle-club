# Nozzle Club — 3D printed keychain store (demo)

Single-page demo shop for custom 3D-printed keychains. Plain HTML/CSS/ES modules, no build step.

## Run

```bash
cd keychain-store
python3 -m http.server 5173
# open http://127.0.0.1:5173
```

Must be served over http (ES modules + font loading don't work from `file://`). Needs internet for CDN libs (three, gsap, lenis, opentype) and Google Fonts.

## What's in it

| Section | What it does |
|---|---|
| Hero | Live 3D printer: keychain prints layer by layer (clip shader + hot nozzle band + gyroid infill on the cut face), ring clips on, it pops off the bed and swings on its ring. Cycles names + animal figures. Type a name → prints yours. Cursor swings it, click twirls. |
| Shop | Pegboard of 9 ready-made figures (cat, shroom, star, bear, ghost, smiley, bunny, heart, fish). One shared WebGL canvas scissored into every tile. Swatches re-print in a new colour; hover twirls; add to cart flies a dot to the cart. |
| Studio | Designer: presets, 7 figures + 6 shapes, optional name (3 fonts), base + detail colours, finish (matte / silk / galaxy sparkle / glow), thickness, ring. Live price + print time. Lights-off toggle shows glow-in-the-dark. **Download STL** exports a real printable model (mm). |
| Process | 4-step sequence. |
| Cart | Drawer with 3D thumbnails, qty, free-shipping meter, demo checkout (confetti, nothing charged). Persists in localStorage. |

## Code map

```
index.html            markup + import map (three r185, gsap 3.15, lenis 1.3)
css/style.css         tokens, layout, responsive, reduced motion
js/main.js            Lenis on gsap.ticker, anchors, hero intro, boot
js/hero.js            printer scene + print/hang state machine
js/shop.js            pegboard tiles, shared scissored renderer, snapshots
js/studio.js          designer UI, OrbitControls, glow mode, STL export
js/cart.js            cart state + drawer
js/lib/keychain.js    procedural geometry (shapes, figures, text, ring) + print material shader
js/lib/stage.js       renderer/env/lights helpers, Swing pendulum
js/lib/fonts.js       WOFF → three Font via TTFLoader (cached)
js/lib/ui.js          toast, fly-to-cart, confetti, money
assets/fonts/         Bagel Fat One, Pacifico (OFL), Helvetiker (MIT)
```

## Techniques

- All models procedural (`ExtrudeGeometry` + `TextGeometry`), extruded along Z like a real flat FDM print — so the STL is printable as-is.
- One `onBeforeCompile` patch on `MeshPhysicalMaterial`: keychain-space clip (`discard` above `uPrint`), layer-line normal ripple every 0.2 mm, emissive hot band, glow-in-the-dark emissive, galaxy sparkle hash, back-face gyroid infill = solid-looking cross-section.
- Single RAF: Lenis + every scene on `gsap.ticker`; scenes pause off-screen via IntersectionObserver.
- `prefers-reduced-motion`: no smooth scroll, no print animation, static hang.

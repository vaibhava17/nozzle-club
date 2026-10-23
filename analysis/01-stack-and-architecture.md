# 01 — Stack & Architecture

## Stack (evidence)

| Layer | Tech | Evidence |
|---|---|---|
| Framework | Next.js **16.2.x** App Router, Turbopack build | `x-powered-by: Next.js`, `globalThis.TURBOPACK` chunks, `version:"16.2.12"`, RSC `self.__next_f` |
| CMS | **Payload CMS** | `x-powered-by: Payload`, `/api/media/file/*.webp`, `payload-live-preview` postMessage (RefreshRouteOnSave) |
| UI | React 19 | `react.dev/errors` minified errors in `2up_x3pib6pc_.js` |
| Animation | **GSAP 3.15.0** + ScrollTrigger, Flip, Observer (ScrollSmoother in bundle, Lenis used instead) | `"3.15.0"`, `registerPlugin(ScrollTrigger)` |
| Smooth scroll | **Lenis 1.3.25** | `"Lenis: Target not found"`, `data-lenis-prevent*` |
| 3D | **Three.js r185** (vanilla, no R3F) + GLTFLoader + RoomEnvironment | `REVISION:"185"`, `data-engine="three.js r185"` |
| Physics | **Matter.js** (UMD, lazy) | `"matter-js"`, `collisionStart` |
| Audio | Web Audio API (`AudioContext`, `decodeAudioData`) | `337eeiph6mwz7.js` |
| Icons | react-icons (FA6) | `FaVolumeHigh`, `FaLink`… |
| Fonts | Adobe Typekit `futura-pt-condensed`, next/font `Inter Tight`, `Nothing You Could Do` | CSS |

Not used: framer-motion, R3F/drei, postprocessing, View Transitions API, Lottie/Rive.

## Chunk map (home page)

| Chunk | Size | Contents |
|---|---|---|
| `0cz1d0mv5g_q7.js` | 112K | polyfills |
| `2r647-psjgy9s.js`, `3nc6x0_y5iwnk.js`, `1ntn7efqc-iiw.js`, `24j6c6ho8vtzb.js`, `2up_x3pib6pc_.js` | ~500K | Next runtime / React DOM |
| `0gj78z5yxdyo1.js` | 70K | GSAP core |
| `149o3s1pke167.js` | 43K | ScrollTrigger / Observer / ScrollSmoother |
| `0k9koybghp6ya.js` | 240K | `three.core` (module 190072) |
| `1m41bpfyl7qvj.js` | 355K | `three.module` (WebGLRenderer, PMREM, shader chunks) |
| `2s0u9hio1067v.js` | 40K | **app shell**: Lenis, preloader, route transitions, cursor, menu, top-band, Payload preview |
| `337eeiph6mwz7.js` | 7K | **event bus** (hold/sweep/release), viewport utils, text reveals, **Web Audio** |
| `1bevjk_zfpi8k.js` | 35K | **home effects**: peel, reveals, parallax, giant pin, hand note, WebGL peel stage, hero tape + note drivers |
| `12brgdlqixjgb.js` | 13K | wave band textPath, giant-pinning, make-it-stick, pl-stage |
| `09lfiv_61siim.js` | 15K | tape product slider |
| `215e8972oexyg.js` | 9K | footer: link reveal, letter poke, Matter ball pit |
| `449pt6kwqbcu2.js` | 4K | hand-note / rolling reveal (404 page) |
| lazy `0_x5nrklz202h.js` | 83K | Matter.js |
| lazy `0qw6zdg5wyeuw.js` | 45K | GLTFLoader + BufferGeometryUtils |
| lazy `3e0ez01ddqlh7.js` | 14K | `createHeroTape` |
| lazy `1118ekqveyvwt.js` | 11K | `createTapeViewer` |
| lazy `3gaupu_gw9zjj.js` | 5K | `createStickyNote` |
| lazy `3o0gscjkt-z9d.js` | 2K | RoomEnvironment |

Pattern: **vanilla imperative modules (`initX(el)` / `createX(el)`) called from React `useEffect`**, cleanup via AbortController + `tween.kill()` + `dispose()`. Heavy libs (three, matter) dynamic-imported; static `<img>` shown until WebGL ready.

## Assets

- **GLB models** (`/assets/tapes/`): `Low-Noise-Tape.glb` (629KB, hero), `Cello-Tape`, `Cloth-Tape`, `Double-Tape`, `Masking-Tape`, `header-brown`, `Header-Brown-Inner`
- **Sounds** (`/assets/sounds/`): bgm.m4a, tape-stretch.wav, tape-press.wav, tape-cut, slide-change, box-pop, menu-pull, menu-hover, sound-toggle, cursor-click, hand-out, logo-zoom, next-hover, pick-hover (.mp3)
- **Textures**: `paper-overlay.webp` (grain), glyph images per word (`/assets/words/creative/A.webp`…), tape strip PNGs, sticky-note.png, cursor SVGs
- CMS images via Payload `/api/media/file/...?v=`

## Home page section map

1. `nav.site-menu` — "PULL ME" paper tab + sound pill (fixed)
2. `section.hero-section` — corner mark "STICK WITH YOU THROUGH THREE GENERATIONS", h1 "WE'RE HERE TO STICK BY YOU" with WebGL-peeling logo, **3D tape roll unrolling on scroll**, cardboard h2 (scroll-scrubbed letters), hand note, 3D sticky note, props (lemon, gift, paperclip) w/ parallax
3. `section.wave-band` — lime tape-shaped SVG wave w/ text running along it ("WHEN LIFE GETS MESSY, SOMETHING HAS TO HOLD")
4. `section.tape-slider-parent` — "MEET THE ONE WHO STICKS": circular roll rail, 3D product turntable, card flips, masked glyph word swap, arc colour sweep
5. `section.giant-pinning` — "WHY WE EXIST": pinned, scrubbed **diagonal/horizontal camera journey** across huge canvas (TO CREATE / TO FIX / TO PROTECT)
6. `section.make-it-stick` — "LET'S MAKE IT STICK!" photo + peel tape
7. `footer.site-footer` — nav, "STICK BY YOU" poke-letters headline, **Matter.js ball pit**

Other pages exist: `/about`, `/products`, `/products/:slug`, `/news`, `/contact` (not analysed).

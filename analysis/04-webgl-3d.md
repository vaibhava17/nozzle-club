# 04 — WebGL / Three.js

Three.js **r185**, vanilla (no R3F). All WebGL modules lazy-imported; static `<img>` until ready.
App never uses `ShaderMaterial` — all `MeshPhysical/StandardMaterial` + `onBeforeCompile` patches + `CanvasTexture`.

## 1. Hero tape roll — `createHeroTape(el, "/assets/tapes/Low-Noise-Tape.glb")`

Tape roll **unrolls a strip as you scroll**; strip end is torn; at bottom it gets "cut" and roll returns home.

### Geometry
- Roll = GLB (centred via Box3, rotation.x = −π/2)
- Strip = procedural, 3 meshes sharing one material:
  - flat run: `PlaneGeometry(1,1).translate(0,-.5,0)` scaled in Y by length
  - torn end: custom BufferGeometry, 180 segments, bottom edge jagged by **1D fBm** (octaves `[[2,1],[5,.62],[13,.34],[31,.19],[73,.1]]`), depth .18, hand-written normals/tangents curled by `FILM.CURL`
  - UV offset scrolls with length → grain travels with tape
- `domeFace`: bends flat face normals outward → face reads convex: `angle = DOME*(r/rmax)^DOME_BIAS`

### Constants
```
CONFIG {rotX:0, rotZ:0, camZ:1.95}
STRIP  {RADIUS:.5, ROLL_W:.472, WIDTH:.838, COLOR:0xe7e7e7, GRAIN:.3}
END    {DEPTH:.18, SEGMENTS:180, ROUGH:.57}
LIGHT  {X:-1.6,Y:3.6,Z:2.5, POWER:1.44, AMBIENT:1.36}      // ambient = PI*AMBIENT
FACE_LIGHT {X:2.7,Y:2,Z:1, POWER:.3}
FILM {GLOSS:.41, MOTTLE:.335, SMUDGE:3.08, TOOTH:.025, TONE:.595, CAST:0xd5c69e,
      GLAZE:.32, GLAZE_GLOSS:.225, STRETCH:.23, SAT:.61, PUNCH:.915, COAT:.085, DOME:.7, CURL:.6 …}
GLASS {AMOUNT:1, CLARITY:.68, SHEEN:.22, WOUND:.11, EDGE:3.2}
```

### Materials
GLB materials cloned → `MeshPhysicalMaterial`:
- film: clearcoat .32 / clearcoatRoughness .225, **anisotropy .23** (rotation π/2), normalScale .025, roughness .41, metalness .03, procedural map/roughness/normal
- face/core: roughness .275, clearcoat .085
- **No `transmission`** — translucency faked w/ Fresnel alpha (cheaper, no extra pass)

### Shader patch (`onBeforeCompile`)
```glsl
// after <map_fragment>: saturation + contrast
float l = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, uSat);
diffuseColor.rgb = clamp(mix(vec3(.21), diffuseColor.rgb, uPunch), 0., 1.);
// before <opaque_fragment>: Fresnel opacity ("glass film")
float ndv = abs(dot(normal, normalize(vViewPosition)));
diffuseColor.a = mix(1. - uClarity, 1., pow(1. - ndv, uEdge));
gReflect = max(outgoingLight - totalDiffuse, vec3(0)) * (1. - diffuseColor.a) * uSheen;
// after <premultiplied_alpha_fragment>: add specular back so it doesn't fade w/ alpha
gl_FragColor.rgb += linearToOutputTexel(vec4(gReflect,1.)).rgb;
```
`transparent`, `premultipliedAlpha`, `depthWrite=false`. Uniforms are shared objects → live tuning w/o recompile.

### Procedural textures (256², RepeatWrapping)
- tileable 2D value-noise fBm on canvas
- mottle: `fbm([[2,1],[5,.6],[11,.28],[23,.1]])^SMUDGE` → map (sRGB) & roughnessMap
- "tooth" normal map: fBm `[[23,1],[53,.62],[113,.36],[211,.2]]`, central differences ×26 → RGB

### Renderer
`{antialias, alpha}`, `NoToneMapping`, clear alpha 0, DPR `min(dpr, 2, 4096/height)`, `camera.setViewOffset` crops square frustum to tall canvas, `--roll-girth` CSS var scales roll. **Dirty-flag render only.**

### Scroll driver
```js
gsap.ticker.add(tick)
y   = Math.max(scrollY - start, 0)            // monotonic, never rewinds
deg = 35 + 55*smoothstep(y/550)
len = smin(4x²/(x+250), viewportBottom, cardboardEnd)   // x = scroll past 420px; polynomial smooth-min
stretchSound.set(gainAndRateFrom(lenVelocity))
// at end → finale
tl.to(s,{cut:1, duration:.7, ease:'power2.in'}).to(s,{home:1, duration:1, ease:'power3.inOut'}, .35)
// then idle drift: sines 7.3s/5.1s/9.7s + pointer follow eased 1-exp(-3dt)
```
Entrance: `y:'13vw', scale:.82 → 0,1` 1.3s `back.out(1.5)` (MutationObserver waits for `data-tape="live"`). IO (rootMargin 50%) pauses. Reduced motion → static `pose(35,0)`.

## 2. Product turntable — `createTapeViewer(el, urls, light, finish, film)`

- Loads first GLB + env, rest sequentially in background; one Group per model, `show()` toggles
- API: `ready, show, spin(deg), point(x,y), home, dispose, tune`
- `classify(bbox)` heuristically labels meshes label/end/core/wound → different materials
- Env: lazy `RoomEnvironment` → `PMREMGenerator.fromScene(room, .04)`, `scene.environmentIntensity = .14`; `envMapIntensity` only on metals
- Pointer: `a=1-exp(-5dt); z+=(F-z)*a; rot.y=.12*z.x; rot.x=-.08*z.y; pos.x=-.09*(z.x-home); pos.y=.065*z.y`
- Home config: `HOME_LIGHT {key:0, ambient:.97, env:.14}`, clarity `{double:.04, stationery:.11, opp:.09, opp-quiet:.1}`
- Canvas fades in .35s; thorough `dispose()`

## 3. WebGL logo peel — `createPeelStage` (`.pl-stage`)

Hero logo letters peel up as real 3D curl, breathe; click → pressed flat.
- `PerspectiveCamera(30°)` at `z = h/2 / tan(15°)` → **1 unit = 1 CSS px**; mesh placed at DOM rect, rotation read from computed `matrix()`
- `addLetter(img)`: rasterise img to canvas; **back texture** via `globalCompositeOperation='source-in'` + `fillRect(backColor)`; alpha-scan for ink bbox
- `PlaneGeometry(w,h,60,60)`, front (FrontSide, alphaTest .45) + back (BackSide) mesh + residue plane (opacity `.26·min(1,1.6p)`)
- Per-frame vertex deform: project on peel axis; before fold line flat; past it wrap around **cylinder** radius `max(2, .13·inkH)` up to θ (158°+wobble), then gently sagging tail (`SAG -.0032`); `computeVertexNormals()`
- Idle wobble: `p += .05·sin(t·.33·2π)`, `θ += 10·sin(t·.33·1.37π)`
- Start: `whenRevealed` → 1.5s → `img.decode()` → hide DOM img → `gsap.to(letter,{p:.6, duration:1.1, ease:'power3.out'})`
- Click hit-box `.pl-hit` → sound + `gsap.to(letter,{p:0, wobble:0, duration:.45, ease:'power3.in'})`

## 4. Sticky note — `createStickyNote(el)`

- `PlaneGeometry(1,.94,44,44)` **CPU-deformed per frame** + `computeVertexNormals`
- `MeshStandardMaterial{roughness:.92, DoubleSide}`; **VSM shadows** onto `ShadowMaterial` plane (opacity .2); light (−2,2.5,3) power 1.1, 512 map, blurSamples 20, radius 9
- Texture: canvas-drawn yellow note (`#f9dd55→#f2cf3e`, "TO-DO LIST" futura + handwritten items), redrawn on `document.fonts.ready`, replaced by PNG when loaded
- Wind per vertex `{SPEED:1, CURL:.14, FLUTTER:.035, TREMBLE:.016, GUST:.3, SCROLL:1.1, POKE:.6}`:
```
gust = pow(max(0, sin(.31t)*sin(.117t+2) - .25)/.75, 1.6) + scrollVel*SCROLL
w    = pinMask(x,y)^2.1                        // top pinned, free corners
z    = w*(CURL + amp*(flutter + tremble*(.35+1.8gust) + GUST*gust*(.55+.45sin(1.3t+1.6x)+.9*diag) + poke))
y   += z*z*.4*smoothstep(v/.3)
```
- Driver: scroll velocity `|dy|/dt/1500` (attack 9 / release 2.5) + pointer proximity poke; IO pause; DPR 2–3

## 5. RoomEnvironment

Verbatim copy of three's addon; only used for PMREM env (sigma .04) in viewer.

## Performance patterns

- Dynamic import every WebGL module; `<img>` fallback until ready
- Render only when dirty; one `gsap.ticker` callback per section, no free RAFs
- DPR clamps (2, plus `4096/h` cap)
- IntersectionObserver pause, ResizeObserver resize
- Background sequential model loading
- Thorough dispose + unmount guards against late loads
- No tone mapping / no postprocessing / transparent canvases layered over DOM

## Unknowns

- GLB internals not inspected (only material names code checks: `Material`, `Material.003`, `Core`, `white`, `Face Brown`)
- `window.peelLab` / `ringLab` hooks suggest an internal dev tuning UI not shipped

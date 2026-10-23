# 05 — Sound & Physics

## Web Audio (`337eeiph6mwz7.js`)

| Key | File |
|---|---|
| TAPE_STRETCH | tape-stretch.wav (loop, follows hero strip velocity) |
| TAPE_CUT | tape-cut.mp3 |
| TAPE_PRESS | tape-press.wav (logo peel click) |
| SLIDE_CHANGE | slide-change.mp3 |
| BALL_HIT / BOX_POP | box-pop.mp3 |
| MENU_PULL / MENU_HOVER | menu-pull.mp3 / menu-hover.mp3 |
| SOUND_TOGGLE | sound-toggle.mp3 |
| CLICK | cursor-click.mp3 (global, except menu tab/sound/pl-hit) |
| HAND_OUT, LOGO_ZOOM, NEXT_HOVER, PICK_HOVER | hand-out / logo-zoom / next-hover / pick-hover .mp3 |
| BGM | bgm.m4a (loop, gain .1) |

```js
// lazily on first user gesture
ctx = new AudioContext(); master = ctx.createGain(); master.connect(ctx.destination)
cache = new Map()  // url -> AudioBuffer (fetch → arrayBuffer → decodeAudioData)

playOnce(url, vol=1)   // new BufferSource → Gain per call; skip if sound off
setSoundOn(on)         // on: resume + BGM loop @ .1 ; off: ctx.suspend()
createLoop(url)        // {set(gain, rate) via setTargetAtTime(…, .06), stop()} — continuous drag sounds
onSoundChange(cb)
```
- **Off by default** (autoplay policy + UX); toggle via sound pill
- Hover sounds only after pointer moved >12px from click point

## Matter.js ball pit (footer, `215e8972oexyg.js` + lazy `0_x5nrklz202h.js`)

Units in vw: `R(v) = v*innerWidth/100` → physics scales w/ viewport.

```js
engine = Engine.create({ enableSleeping: true })
engine.gravity.y = 1
engine.gravity.scale = 60 * ballScale * R(1) / 1e6       // --ball-scale: 1 desktop / 1.58 mobile

ball = Bodies.circle(x, y, el.offsetWidth/2, {
  restitution: .32, friction: .16, frictionAir: .004, density: .001,
  collisionFilter: { mask: -3 }                          // pass through side walls until "armed"
})
// spawn off-screen L/R, release stagger .26s, vx = -side*R(55)/60, vy = R(6)/60, spin 5/60
// static bounds: ground/ceiling/walls rects, thickness R(20); persist force R(90) pushes balls in until armed

gsap.ticker.add((t, dt) => { if (visibleRatio >= .2) Engine.update(engine, Math.min(dt, 20)) })
// speed cap R(85)*scale/60

// pointer push: within R(5) of ball → force ∝ pointer speed (200k radial + 70k along drag)
// drag: pointerdown → Constraint{length:0, stiffness:.06, damping:.08}, grab offset .34; click suppressed if moved >6px; angVel *= .9
// render: el.style.transform = `translate3d(${x-hx}px,${y-hy}px,0) rotate(${angle}rad)`
// resize: snapshot normalized pos/vel → rebuild after 180ms

Events.on(engine, 'collisionStart', ({pairs}) => {
  const v = maxNormalRelSpeed(pairs)   // vw/s
  if (v > 10 && now - last > 90) playOnce(BALL_HIT, Math.min((v-10)/60, 1) * .5)
})
```

Takeaways: DOM elements as physics bodies (no canvas renderer); sleep + IO-gated stepping for perf; impact-velocity-mapped volume w/ debounce.

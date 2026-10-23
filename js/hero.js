// Hero: a keychain printing live, layer by layer, then popping off the bed and swinging on its ring.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import { buildKeychain, FILAMENTS } from './lib/keychain.js';
import { createRenderer, studioEnvironment, addStudioLights, Swing, damp, whenVisible, reducedMotion } from './lib/stage.js';

const BED_Y = -30;
const HANG_Y = 40;

const QUEUE = [
  { text: 'Meera', shape: 'pill', base: 'pink', accent: 'snow', font: 'bagel' },
  { text: 'Zoya', shape: 'cat', base: 'lemon', accent: 'pink', font: 'bagel' },
  { text: 'Kabir', shape: 'pill', base: 'mint', accent: 'ultra', font: 'bagel', finish: 'silk' },
  { text: '', shape: 'bear', base: 'tangerine', accent: 'lemon' },
  { text: 'Aarav', shape: 'pill', base: 'lemon', accent: 'grape', font: 'pacifico' },
  { text: '', shape: 'shroom', base: 'grape', accent: 'snow', finish: 'silk' },
  { text: 'Mia', shape: 'bunny', base: 'snow', accent: 'pink', font: 'pacifico' },
];
const VIVID = ['pink', 'lemon', 'mint', 'tangerine', 'grape'];

function bedTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1546'; g.fillRect(0, 0, 512, 512);
  // textured PEI speckle
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  g.strokeStyle = 'rgba(180,170,255,0.22)'; g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function buildPrinter() {
  const printer = new THREE.Group();
  const bed = new THREE.Mesh(
    new RoundedBoxGeometry(90, 5, 54, 4, 1.8),
    new THREE.MeshStandardMaterial({ map: bedTexture(), roughness: 0.55, metalness: 0.15 }),
  );
  bed.position.y = BED_Y - 2.5;
  bed.receiveShadow = true;
  printer.add(bed);

  const head = new THREE.Group();
  const shroud = new THREE.Mesh(new RoundedBoxGeometry(18, 15, 15, 4, 3), new THREE.MeshStandardMaterial({ color: '#ff6b1a', roughness: 0.45 }));
  shroud.position.y = 14;
  const heater = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), new THREE.MeshStandardMaterial({ color: '#c9ccd6', metalness: 1, roughness: 0.3 }));
  heater.position.y = 5.5;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.5, 24), new THREE.MeshStandardMaterial({ color: '#e0a83a', metalness: 1, roughness: 0.25 }));
  tip.rotation.x = Math.PI; tip.position.y = 1.4;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), new THREE.MeshBasicMaterial({ color: '#ffb24a' }));
  glow.position.y = -0.6;
  const light = new THREE.PointLight('#ff7a1a', 0, 70, 1.6);
  light.position.y = -1;
  head.add(shroud, heater, tip, glow, light);
  [shroud, heater, tip].forEach((m) => { m.castShadow = true; });
  printer.add(head);

  const rod = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 96, 16), new THREE.MeshStandardMaterial({ color: '#d9dde6', metalness: 1, roughness: 0.25 }));
  bar.rotation.z = Math.PI / 2;
  rod.add(bar);
  for (const x of [-50, 50]) {
    const cap = new THREE.Mesh(new RoundedBoxGeometry(7, 9, 9, 3, 2), new THREE.MeshStandardMaterial({ color: '#ff3ea5', roughness: 0.5 }));
    cap.position.x = x;
    rod.add(cap);
  }
  printer.add(rod);
  return { printer, bed, head, glow, light, rod };
}

export function initHero() {
  const stage = document.getElementById('heroStage');
  const canvas = document.getElementById('heroCanvas');
  const hud = {
    status: document.getElementById('hudStatus'), pct: document.getElementById('hudPct'),
    bar: document.getElementById('hudBar'), layer: document.getElementById('hudLayer'),
    layers: document.getElementById('hudLayers'), temp: document.getElementById('hudTemp'),
  };

  const renderer = createRenderer(canvas, { shadows: true });
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 0.55;
  const lights = addStudioLights(scene, { shadow: true });
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 1000);

  const P = buildPrinter();
  scene.add(P.printer);

  const pivot = new THREE.Group();     // hang point (top of ring)
  scene.add(pivot);

  const swing = new Swing({ stiffness: 22, damping: 2.2 });
  const state = { print: 0, hot: 0, twirl: 0, tilt: -0.5, temp: 24, mode: 'idle', lift: 0 };
  let kc = null;           // current keychain
  let scale = 1;
  let queueIdx = 0;
  let autoTimer = null;
  let visible = true;
  let busy = false;
  let pending = null;

  const heroEl = canvas.parentElement;
  function resize() {
    const hr = heroEl.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    if (!hr.width || !sr.height) return;
    renderer.setSize(hr.width, hr.height, false);
    camera.aspect = hr.width / hr.height;
    // keep ~88 world units across the stage height, and centre the scene on the stage
    const base = THREE.MathUtils.degToRad(sr.width < 600 ? 21 : 17.5);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((hr.height / sr.height) * Math.tan(base)));
    const cx = sr.left + sr.width / 2 - hr.left, cy = sr.top + sr.height / 2 - hr.top;
    camera.setViewOffset(hr.width, hr.height, -(cx - hr.width / 2), -(cy - hr.height / 2), hr.width, hr.height);
    camera.position.set(0, 6, 178);
    camera.lookAt(0, 4, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(heroEl);
  new ResizeObserver(resize).observe(stage);
  resize();

  function setHud(status, pct, layer, layers) {
    if (status !== undefined) hud.status.textContent = status;
    if (pct !== undefined) {
      hud.pct.textContent = Math.round(pct) + '%';
      hud.bar.style.width = pct + '%';
    }
    if (layer !== undefined) hud.layer.textContent = layer;
    if (layers !== undefined) hud.layers.textContent = layers;
  }

  async function printDesign(opts) {
    if (busy) { pending = opts; return; }
    busy = true;
    clearTimeout(autoTimer);

    // 1. send the old keychain flying
    if (kc) {
      const old = kc;
      kc = null;
      state.mode = 'leaving';
      await gsap.to(pivot.position, { y: '+=150', duration: 0.7, ease: 'power3.in' });
      pivot.remove(old.group);
      old.dispose();
    }

    // 2. build the new one and park it on the bed
    const next = await buildKeychain({ thickness: 4.5, ring: 'silver', finish: 'matte', ...opts });
    const m = next.meta;
    scale = Math.min(1.25, 66 / m.width, 60 / m.height);
    next.group.position.y = -m.top;
    next.ring.scale.setScalar(0.001);
    next.uniforms.uPrint.value = m.printBottom;
    next.uniforms.uHot.value = 1;
    pivot.add(next.group);
    pivot.scale.setScalar(scale);
    pivot.rotation.set(0, 0, 0);
    swing.a = swing.v = swing.spin = swing.spinV = 0;
    state.twirl = 0;
    kc = next;

    const bedPivotY = BED_Y + scale * (m.top - m.printBottom);
    const layers = Math.round((m.printTop - m.printBottom) / 0.2);
    setHud(`Printing ${opts.text ? `"${opts.text}"` : 'a ' + opts.shape}`, 0, 0, layers);

    if (reducedMotion) {
      next.uniforms.uPrint.value = 999; next.uniforms.uHot.value = 0;
      next.ring.scale.setScalar(1);
      pivot.position.y = HANG_Y;
      P.printer.visible = false;
      state.mode = 'hang';
      setHud('Ready to ship', 100, layers, layers);
      busy = false;
      return;
    }

    // printer comes back up if it was away
    state.mode = 'printing';
    state.tilt = -0.5;
    pivot.position.y = bedPivotY;
    P.printer.visible = true;
    gsap.to(P.printer.position, { y: 0, duration: 0.6, ease: 'power3.out' });

    // 3. heat the nozzle
    setHud('Heating nozzle');
    await gsap.to(state, { temp: 210, duration: state.temp > 200 ? 0.2 : 1.1, ease: 'power2.out' });
    setHud(`Printing ${opts.text ? `"${opts.text}"` : 'a ' + opts.shape}`);

    // 4. print layer by layer
    const dur = 3.4;
    const tl = gsap.timeline();
    tl.to(next.uniforms.uPrint, {
      value: m.printTop, duration: dur, ease: 'none',
      onUpdate() {
        const p = (next.uniforms.uPrint.value - m.printBottom) / (m.printTop - m.printBottom);
        setHud(undefined, p * 100, Math.round(p * layers));
      },
    });
    await tl;
    setHud('Clipping on the ring', 100, layers);
    next.uniforms.uPrint.value = 999;
    gsap.to(next.uniforms.uHot, { value: 0, duration: 0.8 });
    await gsap.to(next.ring.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(2.2)' });

    // 5. pop it off the bed and hang it up
    state.mode = 'lifting';
    gsap.to(state, { temp: 180, duration: 3 });
    gsap.to(P.printer.position, { y: -95, duration: 0.9, ease: 'power3.in', delay: 0.1, onComplete: () => { if (state.mode === 'hang' || state.mode === 'lifting') P.printer.visible = false; } });
    gsap.to(state, { tilt: 0, duration: 1.2, ease: 'power3.out' });
    await gsap.to(pivot.position, { y: HANG_Y, duration: 1.1, ease: 'back.out(1.3)' });
    swing.kick(1.6, 3.2);
    state.mode = 'hang';
    setHud('Done. Give it a swing', 100);

    busy = false;
    if (pending) { const p = pending; pending = null; printDesign(p); return; }
    scheduleNext();
  }

  function scheduleNext(ms = 6500) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if (!visible) { scheduleNext(1500); return; }
      queueIdx = (queueIdx + 1) % QUEUE.length;
      printDesign(QUEUE[queueIdx]);
    }, ms);
  }

  // interaction
  let lastX = null, lastT = 0;
  heroEl.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (lastX !== null && state.mode === 'hang') {
      const dt = Math.max(8, now - lastT);
      const vx = (e.clientX - lastX) / dt;
      swing.kick(vx * 0.32, vx * 0.5);
    }
    lastX = e.clientX; lastT = now;
  });
  heroEl.addEventListener('pointerleave', () => { lastX = null; });
  stage.addEventListener('click', () => {
    if (state.mode !== 'hang') return;
    gsap.to(state, { twirl: state.twirl + Math.PI * 2, duration: 1.3, ease: 'power3.out' });
    swing.kick(0.8);
  });

  const form = document.getElementById('heroForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim().slice(0, 12);
    if (!name) { form.elements.name.focus(); return; }
    const base = VIVID[Math.floor(Math.random() * VIVID.length)];
    const accent = base === 'lemon' || base === 'mint' ? 'ultra' : 'snow';
    clearTimeout(autoTimer);
    printDesign({ text: name, shape: name.length > 7 ? 'pill' : (Math.random() > 0.5 ? 'pill' : 'cat'), base, accent, font: 'bagel' });
  });

  whenVisible(stage, (v) => { visible = v; }, '0px');

  // render loop
  const timer = new THREE.Timer();
  gsap.ticker.add(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    if (!visible) return;
    hud.temp.textContent = Math.round(state.temp);

    if (kc) {
      const m = kc.meta;
      if (state.mode === 'hang') {
        swing.step(dt);
        // gentle idle sway
        swing.kick(Math.sin(t * 0.9) * 0.004);
        pivot.rotation.z = swing.a;
        pivot.rotation.y = swing.spin * 0.6 + state.twirl + Math.sin(t * 0.5) * 0.18;
        pivot.rotation.x = Math.sin(t * 0.7) * 0.04;
      } else {
        pivot.rotation.z = damp(pivot.rotation.z, 0, 6, dt);
        pivot.rotation.y = state.tilt + (state.mode === 'printing' ? Math.sin(t * 0.6) * 0.06 : 0);
      }
      kc.uniforms.uTime.value = t;
      kc.sync();

      // nozzle follows the print line
      if (state.mode === 'printing') {
        const yLocal = Math.min(kc.uniforms.uPrint.value, m.printTop);
        const y = BED_Y + (yLocal - m.printBottom) * scale;
        const sweep = Math.sin(t * 10) * (m.width * 0.5 * scale);
        P.head.position.set(sweep * Math.cos(state.tilt), y + 1.2, -sweep * Math.sin(state.tilt));
        P.rod.position.y = y + 14;
        P.light.intensity = 900 * kc.uniforms.uHot.value;
        P.glow.visible = true;
      } else {
        P.head.position.x = damp(P.head.position.x, 38, 3, dt);
        P.light.intensity = damp(P.light.intensity, 0, 4, dt);
        P.glow.visible = P.light.intensity > 20;
      }
    }
    renderer.render(scene, camera);
  });

  // kick off once fonts are ready
  setHud('Heating nozzle', 0, 0, 0);
  return { start: () => printDesign(QUEUE[0]) };
}

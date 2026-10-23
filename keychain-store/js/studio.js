// Studio: build your own keychain with a live, re-printing 3D preview.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { gsap } from 'gsap';
import { buildKeychain, FILAMENTS, SHAPES, FIGURES, PRESETS } from './lib/keychain.js';
import { createRenderer, studioEnvironment, addStudioLights, whenVisible, reducedMotion } from './lib/stage.js';
import { icon } from './lib/icons.js';
import { money, toast } from './lib/ui.js';
import { cart } from './cart.js';

const SHAPE_PRICE = { pill: 199, circle: 219, star: 229, heart: 219, hex: 219, flower: 239 };
const FIGURE_PRICE = 279;
const FINISH_PRICE = { matte: 0, silk: 49, galaxy: 79, glow: 99 };
const RING_PRICE = { silver: 0, gold: 20, black: 0 };

export function initStudio() {
  const section = document.getElementById('studio');
  const stage = document.getElementById('studioStage');
  const canvas = document.getElementById('studioCanvas');
  const form = document.getElementById('studioForm');
  const $ = (id) => document.getElementById(id);

  const state = { ...PRESETS[0].opts, thickness: 4, ring: 'silver' };

  // ---------- build controls ----------
  const shapeGroup = $('shapeGroup');
  const shapeOpt = (key, label) => `<label class="shape-opt"><input type="radio" name="shape" value="${key}" ${state.shape === key ? 'checked' : ''}/><span>${icon(key)}${label}</span></label>`;
  shapeGroup.innerHTML =
    `<span class="shape-sep">Figures</span>` +
    Object.entries(FIGURES).map(([k, v]) => shapeOpt(k, v.label)).join('') +
    `<span class="shape-sep">Shapes</span>` +
    Object.entries(SHAPES).map(([k, v]) => shapeOpt(k, v.label)).join('');

  const swatchSet = (name) => Object.entries(FILAMENTS).map(([k, f]) =>
    `<label class="swatch" style="--c:${f.hex}" title="${f.name}"><input type="radio" name="${name}" value="${k}" aria-label="${f.name}" ${state[name] === k ? 'checked' : ''}/></label>`).join('');
  $('baseGroup').innerHTML = swatchSet('base');
  $('accentGroup').innerHTML = swatchSet('accent');

  $('presetGroup').innerHTML = PRESETS.map((p, i) =>
    `<button type="button" class="preset" data-i="${i}"><i style="--c:${FILAMENTS[p.opts.base].hex}"></i>${p.label}</button>`).join('');

  function syncForm() {
    form.elements.text.value = state.text;
    for (const k of ['shape', 'base', 'accent', 'font', 'finish', 'ring']) {
      const el = form.querySelector(`input[name="${k}"][value="${state[k]}"]`);
      if (el) el.checked = true;
    }
    form.elements.thickness.value = state.thickness;
  }
  syncForm();

  // ---------- three ----------
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 0.7;
  const lights = addStudioLights(scene, { intensity: 1.1 });
  const baseIntensity = Object.fromEntries(Object.entries(lights).map(([k, l]) => [k, l.intensity]));
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 1000);
  camera.position.set(0, 8, 175);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 90;
  controls.maxDistance = 280;
  controls.autoRotate = false;
  controls.target.set(0, 0, 0);
  controls.saveState();
  // idle sway (instead of a full auto-rotate that shows the thin edge)
  let idle = !reducedMotion, idleTimer;
  controls.addEventListener('start', () => { idle = false; clearTimeout(idleTimer); });
  controls.addEventListener('end', () => { idleTimer = setTimeout(() => { idle = !reducedMotion; }, 3500); });

  const holder = new THREE.Group();
  scene.add(holder);

  // soft halo behind glow-in-the-dark prints
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(170, 170, 1);
  halo.position.z = -30;
  scene.add(halo);
  let kc = null;
  let buildId = 0;
  let lightsOff = false;
  const glowState = { v: 0 };

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  async function rebuild(animate = true) {
    const id = ++buildId;
    const next = await buildKeychain({ ...state });
    if (id !== buildId) { next.dispose(); return; }
    const m = next.meta;
    const s = Math.min(1.4, 64 / m.width, 62 / m.height);
    next.group.position.y = -(m.top + m.bottom) / 2;
    holder.scale.setScalar(s);
    if (kc) { holder.remove(kc.group); kc.dispose(); }
    holder.add(next.group);
    kc = next;
    kc.uniforms.uGlow.value = glowState.v;
    if (animate && !reducedMotion) {
      kc.uniforms.uPrint.value = m.printBottom;
      kc.uniforms.uHot.value = 1;
      gsap.to(kc.uniforms.uPrint, { value: m.printTop, duration: 0.8, ease: 'power2.inOut', onComplete: () => { if (kc === next) next.uniforms.uPrint.value = 999; } });
      gsap.to(kc.uniforms.uHot, { value: 0, duration: 0.5, delay: 0.7 });
    }
    updatePrice();
  }

  function price() {
    const base = FIGURES[state.shape] ? FIGURE_PRICE : SHAPE_PRICE[state.shape] ?? 199;
    const twoTone = state.accent !== state.base ? 30 : 0;
    return base + FINISH_PRICE[state.finish] + RING_PRICE[state.ring] + twoTone;
  }

  function updatePrice() {
    $('studioPrice').textContent = money(price());
    const min = kc?.meta.printMinutes ?? 30;
    $('studioTime').textContent = `Prints in about ${min} min`;
    $('studioAdd').textContent = `Add to cart, ${money(price())}`;
    $('basePicked').textContent = FILAMENTS[state.base].name;
    $('accentPicked').textContent = FILAMENTS[state.accent].name;
    $('thickOut').textContent = `${state.thickness} mm`;
    $('glowNote').hidden = !(lightsOff && state.finish !== 'glow');
  }

  // ---------- events ----------
  let textTimer;
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'text') {
      state.text = t.value.slice(0, 12);
      clearTimeout(textTimer);
      textTimer = setTimeout(() => rebuild(true), 220);
      return;
    }
    if (!t.name) return;
    state[t.name] = t.name === 'thickness' ? Number(t.value) : t.value;
    if (t.name === 'thickness') { clearTimeout(textTimer); textTimer = setTimeout(() => rebuild(false), 90); updatePrice(); return; }
    rebuild(true);
  });

  $('presetGroup').addEventListener('click', (e) => {
    const b = e.target.closest('.preset');
    if (!b) return;
    Object.assign(state, { font: 'bagel', ...PRESETS[Number(b.dataset.i)].opts });
    syncForm();
    rebuild(true);
    gsap.fromTo(holder.rotation, { y: -Math.PI }, { y: 0, duration: 1, ease: 'power3.out' });
  });

  $('resetView').addEventListener('click', () => { controls.reset(); idle = !reducedMotion; });

  $('lightsBtn').addEventListener('click', (e) => {
    lightsOff = !lightsOff;
    e.currentTarget.setAttribute('aria-pressed', String(lightsOff));
    e.currentTarget.querySelector('span').textContent = lightsOff ? 'Lights on' : 'Lights off';
    section.classList.toggle('lights-off', lightsOff);
    const k = lightsOff ? 0.06 : 1;
    for (const [name, l] of Object.entries(lights)) gsap.to(l, { intensity: baseIntensity[name] * k, duration: 0.7 });
    gsap.to(scene, { environmentIntensity: lightsOff ? 0.04 : 0.7, duration: 0.7 });
    gsap.to(glowState, { v: lightsOff ? 1 : 0, duration: 0.9, onUpdate: () => { if (kc) kc.uniforms.uGlow.value = glowState.v; } });
    updatePrice();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const thumb = snapshot();
    const shapeName = FIGURES[state.shape]?.label || SHAPES[state.shape]?.label || 'Custom';
    const finish = { matte: 'Matte', silk: 'Silk', galaxy: 'Galaxy', glow: 'Glow' }[state.finish];
    cart.add({
      key: 'custom-' + JSON.stringify(state),
      name: state.text ? `“${state.text}” ${shapeName.toLowerCase()}` : `Custom ${shapeName.toLowerCase()}`,
      price: price(), color: state.base, thumb,
      detail: `${FILAMENTS[state.base].name} + ${FILAMENTS[state.accent].name}, ${finish}, ${state.thickness} mm, ${state.ring} ring`,
    }, $('studioAdd'));
  });

  $('studioStl').addEventListener('click', () => {
    if (!kc) return;
    kc.group.updateMatrixWorld(true);
    const out = new THREE.Group();
    const inv = new THREE.Matrix4().copy(kc.group.matrixWorld).invert();
    for (const mesh of kc.printable) {
      const g = mesh.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
      out.add(new THREE.Mesh(g));
    }
    out.updateMatrixWorld(true);
    const data = new STLExporter().parse(out, { binary: true });
    out.traverse((c) => c.geometry?.dispose());
    const blob = new Blob([data], { type: 'model/stl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(state.text || state.shape).replace(/[^\w-]+/g, '-').toLowerCase()}-nozzle-club.stl`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('STL downloaded. Units are millimetres, ready for your slicer.');
  });

  function snapshot() {
    renderer.render(scene, camera);
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const w = canvas.width, h = canvas.height, side = Math.min(w, h);
    c.getContext('2d').drawImage(canvas, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 160, 160);
    return c.toDataURL('image/webp', 0.85);
  }

  // ---------- loop ----------
  let visible = false;
  whenVisible(stage, (v) => { visible = v; }, '15% 0px');
  const timer = new THREE.Timer();
  gsap.ticker.add(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    if (!visible || !kc) return;
    controls.update(dt);
    const sway = idle ? Math.sin(timer.getElapsed() * 0.7) * 0.55 : 0;
    holder.rotation.y += (sway - holder.rotation.y) * (1 - Math.exp(-3 * dt));
    holder.rotation.x = idle ? Math.sin(timer.getElapsed() * 0.5) * 0.08 : holder.rotation.x * 0.9;
    kc.uniforms.uTime.value = timer.getElapsed();
    kc.sync();
    halo.material.opacity = glowState.v * (state.finish === 'glow' ? 0.42 : 0);
    halo.material.color.set(FILAMENTS[state.base].hex);
    renderer.render(scene, camera);
  });

  rebuild(false);
}

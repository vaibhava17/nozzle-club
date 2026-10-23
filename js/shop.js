// Pegboard shop: one fixed WebGL canvas, scissored into every product tile.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { buildKeychain, PRODUCTS, FILAMENTS } from './lib/keychain.js';
import { createRenderer, studioEnvironment, addStudioLights, Swing, whenVisible, reducedMotion } from './lib/stage.js';
import { money } from './lib/ui.js';
import { cart } from './cart.js';
import { markOpeningSoon, blockedWhileClosed } from './lib/shop-status.js';

export function initShop() {
  const board = document.getElementById('pegboard');
  const section = document.getElementById('shop');
  const canvas = document.getElementById('shopCanvas');
  const renderer = createRenderer(canvas);
  renderer.setScissorTest(true);
  const env = studioEnvironment(renderer);
  const tiles = [];
  let active = false;

  function sizeCanvas() {
    renderer.setSize(innerWidth, innerHeight);
  }
  sizeCanvas();
  addEventListener('resize', sizeCanvas);

  PRODUCTS.forEach((p, i) => {
    const el = document.createElement('article');
    el.className = 'peg';
    el.innerHTML = `
      <div class="peg-view" role="img" aria-label="${p.name} keychain, live 3D preview"></div>
      <div class="tag">
        <div class="tag-head"><h3>${p.name}</h3><span class="price">${money(p.price)}</span></div>
        <p class="blurb">${p.blurb}</p>
        <div class="tag-foot">
          <div class="swatches" role="group" aria-label="Colour for ${p.name}">
            ${p.colors.map((c, ci) => `<button class="swatch" type="button" style="--c:${FILAMENTS[c].hex}" aria-label="${FILAMENTS[c].name}" aria-pressed="${ci === 0}" data-c="${c}"></button>`).join('')}
          </div>
          <button class="btn btn-pink add" type="button">Add to cart</button>
        </div>
      </div>`;
    board.appendChild(el);

    const scene = new THREE.Scene();
    scene.environment = env;
    scene.environmentIntensity = 0.6;
    addStudioLights(scene);
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 600);
    camera.position.set(0, 0, 160);
    const pivot = new THREE.Group();
    pivot.position.y = 37;
    scene.add(pivot);

    const tile = {
      p, el, view: el.querySelector('.peg-view'), scene, camera, pivot,
      swing: new Swing({ stiffness: 20 + i, damping: 1.8 }),
      kc: null, color: p.colors[0], twirl: { v: 0 }, phase: i * 1.7,
    };
    tiles.push(tile);
    load(tile, tile.color);

    // interaction: hover twirl, move to swing
    let lx = null, lt = 0;
    tile.view.addEventListener('pointerenter', () => {
      if (reducedMotion) return;
      gsap.to(tile.twirl, { v: tile.twirl.v + Math.PI * 2, duration: 1.4, ease: 'power3.out' });
    });
    tile.view.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (lx !== null) tile.swing.kick(((e.clientX - lx) / Math.max(8, now - lt)) * 0.28);
      lx = e.clientX; lt = now;
    });
    tile.view.addEventListener('pointerleave', () => { lx = null; });

    el.querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => {
      el.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      load(tile, b.dataset.c);
    }));
    markOpeningSoon(el.querySelector('.add'));
    el.querySelector('.add').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (blockedWhileClosed(btn)) return;    // skip the snapshot render too
      const thumb = snapshot(tile);
      cart.add({
        key: `${p.id}-${tile.color}`, name: p.name, price: p.price, color: tile.color,
        detail: `${FILAMENTS[tile.color].name}, ready-made`, thumb,
      }, btn);
    });
  });

  async function load(tile, color) {
    tile.color = color;
    const kc = await buildKeychain(tile.p.build(color));
    if (tile.color !== color) { kc.dispose(); return; }
    const m = kc.meta;
    const s = Math.min(1.3, 60 / m.width, 70 / m.height);
    kc.group.position.y = -m.top;
    if (tile.kc) {
      const old = tile.kc;
      tile.pivot.remove(old.group); old.dispose();
      // quick re-print sweep for colour changes
      if (!reducedMotion) {
        kc.uniforms.uPrint.value = m.printBottom; kc.uniforms.uHot.value = 1;
        gsap.to(kc.uniforms.uPrint, { value: m.printTop, duration: 0.7, ease: 'power2.inOut', onComplete: () => { kc.uniforms.uPrint.value = 999; } });
        gsap.to(kc.uniforms.uHot, { value: 0, duration: 0.6, delay: 0.5 });
      }
      tile.swing.kick(1.2);
    }
    tile.pivot.scale.setScalar(s);
    tile.pivot.add(kc.group);
    tile.kc = kc;
  }

  // render the tile into a corner of the shared canvas and crop it (works even when the tile is off-screen)
  function snapshot(tile) {
    if (!tile.kc) return null;
    const S = 256;
    tile.kc.sync();
    tile.camera.aspect = 1;
    tile.camera.zoom = 1.3;
    tile.camera.position.y = tile.pivot.position.y - tile.pivot.scale.x * tile.kc.meta.height / 2;
    tile.camera.updateProjectionMatrix();
    const H = innerHeight;
    renderer.setViewport(0, H - S, S, S);
    renderer.setScissor(0, H - S, S, S);
    renderer.render(tile.scene, tile.camera);
    const dpr = renderer.getPixelRatio();
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    c.getContext('2d').drawImage(canvas, 0, 0, S * dpr, S * dpr, 0, 0, 160, 160);
    tile.camera.zoom = 1;
    tile.camera.position.y = 0;
    tile.camera.updateProjectionMatrix();
    renderer.setScissor(0, 0, innerWidth, H);
    renderer.clear();
    return c.toDataURL('image/webp', 0.85);
  }

  whenVisible(section, (v) => {
    active = v;
    if (!v) { renderer.setScissor(0, 0, innerWidth, innerHeight); renderer.clear(); }
  }, '0px');

  const timer = new THREE.Timer();
  gsap.ticker.add(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    if (!active) return;
    const H = innerHeight;
    renderer.setScissor(0, 0, innerWidth, H);
    renderer.clear();
    for (const tile of tiles) {
      if (!tile.kc) continue;
      const r = tile.view.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width === 0) continue;
      tile.swing.step(dt);
      if (!reducedMotion) tile.swing.kick(Math.sin(t * 0.8 + tile.phase) * 0.003);
      tile.pivot.rotation.z = tile.swing.a;
      tile.pivot.rotation.y = tile.twirl.v + Math.sin(t * 0.6 + tile.phase) * 0.35;
      tile.kc.uniforms.uTime.value = t;
      tile.kc.sync();
      tile.camera.aspect = r.width / r.height;
      tile.camera.updateProjectionMatrix();
      renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
      renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
      renderer.render(tile.scene, tile.camera);
    }
  });
}

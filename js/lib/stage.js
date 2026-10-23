// Shared renderer/scene helpers.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createRenderer(canvas, { shadows = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  return renderer;
}

const envCache = new WeakMap();
export function studioEnvironment(renderer) {
  if (envCache.has(renderer)) return envCache.get(renderer);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  envCache.set(renderer, tex);
  return tex;
}

// Vibrant studio lighting: warm key, pink + cyan rims.
export function addStudioLights(scene, { shadow = false, intensity = 1 } = {}) {
  const key = new THREE.DirectionalLight('#fff6ea', 2.2 * intensity);
  key.position.set(30, 60, 80);
  if (shadow) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -70; key.shadow.camera.right = 70;
    key.shadow.camera.top = 70; key.shadow.camera.bottom = -70;
    key.shadow.camera.near = 1; key.shadow.camera.far = 260;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0008;
  }
  const rimPink = new THREE.DirectionalLight('#ff4fb3', 1.6 * intensity);
  rimPink.position.set(-80, 20, -30);
  const rimCyan = new THREE.DirectionalLight('#38e1ff', 1.3 * intensity);
  rimCyan.position.set(80, -10, -40);
  const hemi = new THREE.HemisphereLight('#ffffff', '#3b2bff', 0.55 * intensity);
  scene.add(key, rimPink, rimCyan, hemi);
  return { key, rimPink, rimCyan, hemi };
}

// Frame-rate independent smoothing.
export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

// Run fn only while element is on screen.
export function whenVisible(el, cb, rootMargin = '10% 0px') {
  const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin });
  io.observe(el);
  return () => io.disconnect();
}

// Damped pendulum for hanging keychains. Angles in radians.
export class Swing {
  constructor({ stiffness = 26, damping = 2.6 } = {}) {
    this.a = 0; this.v = 0; this.k = stiffness; this.c = damping;
    this.spin = 0; this.spinV = 0;
  }
  kick(impulse, spinImpulse = 0) { this.v += impulse; this.spinV += spinImpulse; }
  step(dt) {
    const h = Math.min(dt, 1 / 30);
    this.v += (-this.k * Math.sin(this.a) - this.c * this.v) * h;
    this.a += this.v * h;
    this.spinV += (-9 * this.spin - 1.6 * this.spinV) * h;
    this.spin += this.spinV * h;
    return this;
  }
}

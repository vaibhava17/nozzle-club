// Procedural 3D-printable keychain builder.
// Units are millimetres; every part is extruded along local +Z like a real flat FDM print.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { getFont } from './fonts.js';

export const FILAMENTS = {
  ultra:     { name: 'Ultra blue', hex: '#2d1bff' },
  pink:      { name: 'Hot pink',   hex: '#ff3ea5' },
  lemon:     { name: 'Lemon',      hex: '#ffe03a' },
  mint:      { name: 'Mint',       hex: '#22e3a6' },
  tangerine: { name: 'Tangerine',  hex: '#ff6b1a' },
  grape:     { name: 'Grape',      hex: '#8b3dff' },
  snow:      { name: 'Snow',       hex: '#f7f6ff' },
  ink:       { name: 'Ink',        hex: '#1b1546' },
};

export const RINGS = {
  silver: { color: '#d9dde6', roughness: 0.22 },
  gold:   { color: '#f1bf4b', roughness: 0.26 },
  black:  { color: '#2a2833', roughness: 0.35 },
};

const LAYER = 0.2; // layer height in mm

// ---------- 2D outlines ----------

function roundedPolygon(points, radius) {
  const s = new THREE.Shape();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n];
    const v1 = p0.clone().sub(p1), v2 = p2.clone().sub(p1);
    const r = Math.min(radius, v1.length() / 2.2, v2.length() / 2.2);
    const a = p1.clone().add(v1.normalize().multiplyScalar(r));
    const b = p1.clone().add(v2.normalize().multiplyScalar(r));
    if (i === 0) s.moveTo(a.x, a.y); else s.lineTo(a.x, a.y);
    s.quadraticCurveTo(p1.x, p1.y, b.x, b.y);
  }
  s.closePath();
  return s;
}

function circleShape(r, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return s;
}

function circlePath(r, cx = 0, cy = 0) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}

function pillShape(w, h) {
  const r = h / 2, x = w / 2 - r;
  const s = new THREE.Shape();
  s.moveTo(-x, -r);
  s.lineTo(x, -r);
  s.absarc(x, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-x, r);
  s.absarc(-x, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}

function starShape(outer = 23, inner = 11.5, n = 5, round = 3.2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / n;
    const r = i % 2 ? inner : outer;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return roundedPolygon(pts, round);
}

function polyShape(n = 6, r = 21, round = 3.5) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / n;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return roundedPolygon(pts, round);
}

function heartShape(scale = 1) {
  const s = new THREE.Shape();
  const k = scale;
  s.moveTo(0, -20 * k);
  s.bezierCurveTo(-6 * k, -14 * k, -23 * k, -4 * k, -23 * k, 7 * k);
  s.bezierCurveTo(-23 * k, 16 * k, -16 * k, 21 * k, -10.5 * k, 21 * k);
  s.bezierCurveTo(-5 * k, 21 * k, -1.5 * k, 17.5 * k, 0, 13.5 * k);
  s.bezierCurveTo(1.5 * k, 17.5 * k, 5 * k, 21 * k, 10.5 * k, 21 * k);
  s.bezierCurveTo(16 * k, 21 * k, 23 * k, 16 * k, 23 * k, 7 * k);
  s.bezierCurveTo(23 * k, -4 * k, 6 * k, -14 * k, 0, -20 * k);
  return s;
}

function flowerShape(R = 19, bumps = 6, amp = 0.16) {
  const s = new THREE.Shape();
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = R * (1 + amp * Math.pow(Math.abs(Math.cos((bumps * t) / 2)), 0.6));
    const x = Math.cos(t + Math.PI / 2) * r, y = Math.sin(t + Math.PI / 2) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  return s;
}

function ghostShape() {
  const s = new THREE.Shape();
  s.moveTo(-15, -17);
  s.lineTo(-15, 3);
  s.absarc(0, 3, 15, Math.PI, 0, true);
  s.lineTo(15, -17);
  // wavy hem
  const waves = 4, w = 30 / waves;
  for (let i = 0; i < waves; i++) {
    const x0 = 15 - i * w;
    s.quadraticCurveTo(x0 - w / 2, i % 2 ? -21.5 : -12.5, x0 - w, -17);
  }
  return s;
}

function mushroomShape() {
  const s = new THREE.Shape();
  s.moveTo(-7, -17);
  s.lineTo(-7.5, -4);
  s.lineTo(-17, -4);
  s.quadraticCurveTo(-24, -4, -22.5, 3);
  s.bezierCurveTo(-19, 21, 19, 21, 22.5, 3);
  s.quadraticCurveTo(24, -4, 17, -4);
  s.lineTo(7.5, -4);
  s.lineTo(7, -17);
  s.quadraticCurveTo(7, -20.5, 3.5, -20.5);
  s.lineTo(-3.5, -20.5);
  s.quadraticCurveTo(-7, -20.5, -7, -17);
  return s;
}

function smileShape() {
  const s = new THREE.Shape();
  s.absarc(0, -2, 10.5, Math.PI * 1.12, Math.PI * 1.88, false);
  s.absarc(0, -2, 7.2, Math.PI * 1.88, Math.PI * 1.12, true);
  s.closePath();
  return s;
}

function ellipseShape(cx, cy, rx, ry, rot = 0) {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, rot);
  return s;
}

function catShape() {
  const P = (x, y) => new THREE.Vector2(x, y);
  return roundedPolygon([
    P(-20, -6), P(-18, -14), P(-10, -19.5), P(0, -20.5), P(10, -19.5), P(18, -14), P(20, -6),
    P(20.5, 5), P(18, 21), P(9, 12.5), P(0, 13.5), P(-9, 12.5), P(-18, 21), P(-20.5, 5),
  ], 3.4);
}

function pawShape() {
  // main pad
  const s = new THREE.Shape();
  s.moveTo(0, 1.5);
  s.bezierCurveTo(6, 1.5, 10, -4, 10, -8);
  s.bezierCurveTo(10, -12, 6, -13.5, 0, -11.5);
  s.bezierCurveTo(-6, -13.5, -10, -12, -10, -8);
  s.bezierCurveTo(-10, -4, -6, 1.5, 0, 1.5);
  return s;
}

function triangleShape(a, b, c, round = 2) {
  return roundedPolygon([new THREE.Vector2(...a), new THREE.Vector2(...b), new THREE.Vector2(...c)], round);
}

export const SHAPES = {
  pill:   { label: 'Pill',   build: null },          // sized from text
  circle: { label: 'Circle', build: () => circleShape(21) },
  star:   { label: 'Star',   build: () => starShape() },
  heart:  { label: 'Heart',  build: () => heartShape(1) },
  hex:    { label: 'Hex',    build: () => polyShape(6, 21.5, 3.5) },
  flower: { label: 'Flower', build: () => flowerShape() },
};

// Figures: outline + extra same-height parts + raised face details.
// Colour roles: 'accent' = user's second colour, 'eye' = auto contrast, 'blush' = pink/lemon.
export const FIGURES = {
  cat: {
    label: 'Cat', outline: catShape, tab: [0, 13.5],
    inlays: [
      { type: 'shape', shape: () => triangleShape([-16, 17.5], [-15.5, 8], [-9.5, 11.5], 1.2), color: 'blush' },
      { type: 'shape', shape: () => triangleShape([16, 17.5], [15.5, 8], [9.5, 11.5], 1.2), color: 'blush' },
      { type: 'circle', r: 2.7, x: -7.5, y: 1, color: 'eye' },
      { type: 'circle', r: 2.7, x: 7.5, y: 1, color: 'eye' },
      { type: 'shape', shape: () => triangleShape([-2.6, -4.5], [2.6, -4.5], [0, -7.6], 1), color: 'blush' },
    ],
  },
  bear: {
    label: 'Bear', outline: () => circleShape(18, 0, -2), tab: [0, 16],
    parts: [() => circleShape(7.5, -13, 12), () => circleShape(7.5, 13, 12)],
    inlays: [
      { type: 'circle', r: 3.8, x: -13, y: 12, color: 'blush' },
      { type: 'circle', r: 3.8, x: 13, y: 12, color: 'blush' },
      { type: 'circle', r: 2.4, x: -6.5, y: 2, color: 'eye' },
      { type: 'circle', r: 2.4, x: 6.5, y: 2, color: 'eye' },
      { type: 'shape', shape: () => ellipseShape(0, -7, 7.5, 5.8), color: 'accent', depth: 0.8 },
      { type: 'shape', shape: () => ellipseShape(0, -5.2, 2.6, 1.9), color: 'eye', z: 1.0 },
    ],
  },
  bunny: {
    label: 'Bunny', outline: () => circleShape(16.5, 0, -6), tab: [0, 10.5],
    parts: [() => ellipseShape(-7.5, 15, 5, 13, 0.18), () => ellipseShape(7.5, 15, 5, 13, -0.18)],
    inlays: [
      { type: 'shape', shape: () => ellipseShape(-7.8, 16, 2.2, 8.5, 0.18), color: 'blush' },
      { type: 'shape', shape: () => ellipseShape(7.8, 16, 2.2, 8.5, -0.18), color: 'blush' },
      { type: 'circle', r: 2.3, x: -6, y: -3, color: 'eye' },
      { type: 'circle', r: 2.3, x: 6, y: -3, color: 'eye' },
      { type: 'circle', r: 1.8, x: 0, y: -8.5, color: 'blush' },
    ],
  },
  fish: {
    label: 'Fish', outline: () => ellipseShape(-3, 0, 17, 12), tab: [-3, 11.5],
    parts: [() => triangleShape([11, 0], [23, 11], [23, -11], 3)],
    inlays: [
      { type: 'circle', r: 2.8, x: -11, y: 2.5, color: 'eye' },
      { type: 'shape', shape: () => triangleShape([-1, 9], [6, 0], [-1, -9], 2), color: 'accent', depth: 0.8 },
      { type: 'shape', shape: () => triangleShape([14, 0], [20.5, 7], [20.5, -7], 1.6), color: 'accent', depth: 0.8 },
    ],
  },
  paw: {
    label: 'Paw', outline: () => circleShape(20, 0, -1), tab: [0, 18],
    inlays: [
      { type: 'shape', shape: pawShape, color: 'accent' },
      { type: 'shape', shape: () => ellipseShape(-10.5, 2.5, 3.2, 4, 0.5), color: 'accent' },
      { type: 'shape', shape: () => ellipseShape(-4, 8, 3.2, 4.2, 0.15), color: 'accent' },
      { type: 'shape', shape: () => ellipseShape(4, 8, 3.2, 4.2, -0.15), color: 'accent' },
      { type: 'shape', shape: () => ellipseShape(10.5, 2.5, 3.2, 4, -0.5), color: 'accent' },
    ],
  },
  ghost: {
    label: 'Ghost', outline: ghostShape, tab: [0, 18],
    inlays: [
      { type: 'circle', r: 3, x: -5.5, y: 4, color: 'eye' },
      { type: 'circle', r: 3, x: 5.5, y: 4, color: 'eye' },
      { type: 'circle', r: 1.8, x: 0, y: -4, color: 'blush' },
    ],
  },
  shroom: {
    label: 'Shroom', outline: mushroomShape, tab: [0, 17.5],
    inlays: [
      { type: 'circle', r: 3.2, x: -9, y: 7, color: 'accent' },
      { type: 'circle', r: 2.2, x: 2, y: 12, color: 'accent' },
      { type: 'circle', r: 2.7, x: 11, y: 5, color: 'accent' },
    ],
  },
};

const DARK = new Set(['ink', 'ultra', 'grape']);
function resolveRole(role, o) {
  if (role === 'accent') return o.accent;
  if (role === 'eye') return DARK.has(o.base) ? 'snow' : 'ink';
  if (role === 'blush') return o.base === 'pink' ? 'lemon' : 'pink';
  return role;
}

// ---------- shader-patched "printed plastic" material ----------

const FINISH = {
  matte:  { roughness: 0.62, metalness: 0.0, clearcoat: 0.0 },
  silk:   { roughness: 0.26, metalness: 0.42, clearcoat: 0.35 },
  galaxy: { roughness: 0.38, metalness: 0.12, clearcoat: 0.55 },
  glow:   { roughness: 0.55, metalness: 0.0, clearcoat: 0.0 },
};
export const FINISHES = { matte: 'Matte', silk: 'Silk', galaxy: 'Galaxy', glow: 'Glow in the dark' };

function makeSharedUniforms() {
  return {
    uPrint: { value: 999 },          // keychain-space Y above which nothing is printed yet
    uHot: { value: 0 },              // strength of the hot glowing band at the print line
    uGlow: { value: 0 },             // 0 = lights on, 1 = lights off (glow filament shines)
    uKeyInv: { value: new THREE.Matrix4() },
    uKeyAxis: { value: new THREE.Vector3(0, 0, 1) },
    uTime: { value: 0 },
  };
}

function printMaterial(hex, finish, shared) {
  const f = FINISH[finish] || FINISH.matte;
  const color = new THREE.Color(hex);
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: f.roughness,
    metalness: f.metalness,
    clearcoat: f.clearcoat,
    clearcoatRoughness: 0.3,
    side: THREE.DoubleSide,
  });
  if (finish === 'silk') { m.sheen = 1; m.sheenRoughness = 0.35; m.sheenColor = color.clone().lerp(new THREE.Color('#ffffff'), 0.5); }
  const local = {
    uFill: { value: color.clone().multiplyScalar(0.82) },
    uGlowColor: { value: color.clone().lerp(new THREE.Color('#d8ff6b'), finish === 'glow' ? 0.15 : 0) },
    uIsGlow: { value: finish === 'glow' ? 1 : 0 },
    uSparkle: { value: finish === 'galaxy' ? 1 : 0 },
    uLayer: { value: LAYER },
  };
  m.userData.local = local;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shared, local);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform mat4 uKeyInv; uniform vec3 uKeyAxis;
        varying vec3 vKey; varying vec3 vAxisV;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vKey = (uKeyInv * modelMatrix * vec4(transformed, 1.0)).xyz;
        vAxisV = normalize((viewMatrix * vec4(uKeyAxis, 0.0)).xyz);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uPrint, uHot, uGlow, uIsGlow, uSparkle, uLayer, uTime;
        uniform vec3 uFill, uGlowColor;
        varying vec3 vKey; varying vec3 vAxisV;
        float hash13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vKey.y > uPrint) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float layerPh = vKey.z / uLayer * 6.28318;
        diffuseColor.rgb *= 0.95 + 0.05 * sin(layerPh);
        if (uSparkle > 0.5) {
          vec3 cell = floor(vKey * 2.6);
          float h = hash13(cell);
          float spark = step(0.965, h) * (0.6 + 0.4 * sin(uTime * 3.0 + h * 40.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.95, 1.0), spark * 0.85);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float sideW = 1.0 - abs(dot(normal, vAxisV));
        normal = normalize(normal + vAxisV * sin(vKey.z / uLayer * 6.28318) * 0.22 * sideW);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uGlowColor * uIsGlow * uGlow * 1.6;
        float band = smoothstep(uPrint - 1.4, uPrint, vKey.y) * uHot;
        totalEmissiveRadiance += vec3(1.0, 0.42, 0.08) * band * 2.4;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (!gl_FrontFacing) {
          // cross-section: show a gyroid-ish infill pattern on the cut face
          vec3 q = vKey * 1.35;
          float g = sin(q.x) * cos(q.y) + sin(q.y) * cos(q.z) + sin(q.z) * cos(q.x);
          float wall = 1.0 - smoothstep(0.08, 0.28, abs(g));
          vec3 c = mix(uFill * 0.45, uFill * 1.05, wall);
          float hot = smoothstep(uPrint - 1.6, uPrint, vKey.y) * uHot;
          gl_FragColor = vec4(mix(c, vec3(1.0, 0.55, 0.15), hot * 0.65), 1.0);
        }`);
  };
  m.customProgramCacheKey = () => 'nozzle-print-v1';
  return m;
}

function ringMaterial(kind) {
  const r = RINGS[kind] || RINGS.silver;
  return new THREE.MeshStandardMaterial({ color: r.color, metalness: 1, roughness: r.roughness });
}

// ---------- builder ----------

const EXTRUDE_BASE = { curveSegments: 28, bevelEnabled: true, bevelSegments: 3 };

function extrude(shape, depth, bevel = 0.7) {
  const g = new THREE.ExtrudeGeometry(shape, { ...EXTRUDE_BASE, depth, bevelThickness: bevel, bevelSize: bevel * 0.85 });
  return g;
}

async function textGeometry(text, fontKey, size) {
  const font = await getFont(fontKey);
  const g = new TextGeometry(text, {
    font, size, depth: 1.6, curveSegments: 8,
    bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.22, bevelSegments: 2,
  });
  g.computeBoundingBox();
  return g;
}

/**
 * opts: { text, font, shape, base, accent, finish, thickness, ring, inlays, outline }
 * shape: a key of SHAPES (basic), FIGURES (animals/characters) or 'custom' with outline().
 */
export async function buildKeychain(opts = {}) {
  const o = {
    text: '', font: 'bagel', shape: 'pill', base: 'pink', accent: 'snow',
    finish: 'matte', thickness: 4, ring: 'silver', inlays: null, outline: null,
    ...opts,
  };
  const shared = makeSharedUniforms();
  const hexOf = (c) => FILAMENTS[c]?.hex || c;
  const matBase = printMaterial(hexOf(o.base), o.finish, shared);
  const accentFinish = o.finish === 'galaxy' ? 'matte' : o.finish;
  const mats = new Map([[o.base, matBase]]);
  const matFor = (c) => {
    if (!mats.has(c)) mats.set(c, printMaterial(hexOf(c), accentFinish, shared));
    return mats.get(c);
  };

  const group = new THREE.Group();     // keychain space (origin = body centre, Z = print axis)
  const printable = [];
  const t = o.thickness;
  const faceZ = t + 0.7;               // top of base incl. bevel
  const figure = FIGURES[o.shape];
  const add = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); printable.push(mesh); return mesh; };

  // --- text (measured first so pills/banners can size around it)
  const text = (o.text || '').trim();
  const tg = text ? await textGeometry(text, o.font, 10) : null;
  const tW = tg ? tg.boundingBox.max.x - tg.boundingBox.min.x : 0;
  const tH = tg ? tg.boundingBox.max.y - tg.boundingBox.min.y : 0;

  // --- body outline
  let shape;
  if (o.outline) shape = o.outline();
  else if (figure) shape = figure.outline();
  else if (o.shape === 'pill' || !SHAPES[o.shape]) shape = pillShape(Math.max(34, Math.min(tW + 16, 120)), 22);
  else shape = SHAPES[o.shape].build();

  const bodyGeo = extrude(shape, t);
  bodyGeo.computeBoundingBox();
  const bb = bodyGeo.boundingBox.clone();
  add(new THREE.Mesh(bodyGeo, matBase));

  // same-height extra parts (ears, tails)
  for (const p of figure?.parts || []) {
    const g = extrude(p(), t);
    g.computeBoundingBox();
    bb.union(g.boundingBox);
    add(new THREE.Mesh(g, matBase));
  }
  const bodyW = bb.max.x - bb.min.x, bodyH = bb.max.y - bb.min.y;

  // --- name banner under figures
  let bannerY = null;
  if (figure && tg) {
    const bw = Math.max(30, Math.min(tW * 0.82 + 14, 96));
    bannerY = bb.min.y - 5;
    const banner = pillShape(bw, 17);
    const g = extrude(banner, t);
    g.translate(0, bannerY, 0);
    g.computeBoundingBox();
    add(new THREE.Mesh(g, matBase));
    bb.min.y = Math.min(bb.min.y, g.boundingBox.min.y);
  }

  // --- hanging tab with hole
  const tabR = 5.6, holeR = 2.6;
  const [tabX, tabYRaw] = figure?.tab || [0, bb.max.y];
  const tabY = tabYRaw + 2.4;
  const tab = circleShape(tabR, tabX, tabY);
  tab.holes.push(circlePath(holeR, tabX, tabY));
  add(new THREE.Mesh(extrude(tab, t, 0.6), matBase));

  // --- text placement (raised on the face)
  if (tg) {
    let maxW, maxH, cy = 0;
    if (bannerY !== null) { maxW = Math.max(30, Math.min(tW * 0.82 + 14, 96)) - 10; maxH = 9.5; cy = bannerY; }
    else if (o.shape === 'pill' || !SHAPES[o.shape]) { maxW = bodyW - 12; maxH = 13; }
    else { maxW = bodyW * 0.68; maxH = bodyH * 0.36; cy = o.shape === 'heart' ? 2 : o.shape === 'star' ? -1 : 0; }
    const s = Math.min(maxW / tW, maxH / tH, 1.25);
    tg.center();
    const tm = add(new THREE.Mesh(tg, matFor(o.accent)));
    tm.scale.set(s, s, 1);
    tm.position.set(0, cy, faceZ + 0.8 - 0.25);
  }

  // --- raised details (eyes, spots, inlays)
  for (const inl of [...(figure?.inlays || []), ...(o.inlays || [])]) {
    const color = resolveRole(inl.color, o);
    let sh;
    if (inl.type === 'circle') sh = circleShape(inl.r, inl.x, inl.y);
    else if (inl.type === 'smile') sh = smileShape();
    else sh = inl.shape();
    const m = add(new THREE.Mesh(extrude(sh, inl.depth ?? 1.2, 0.3), matFor(color)));
    m.position.z = faceZ - 0.1 + (inl.z || 0);
  }

  // centre thickness around z=0 (so rotation looks natural)
  const zc = (t + 2) / 2;
  for (const c of group.children) c.position.z -= zc;

  // --- metal split ring through the tab hole
  const R = 9.5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.95, 18, 96), ringMaterial(o.ring));
  ring.rotation.y = Math.PI / 2;
  ring.position.set(tabX, tabY + R, 0);
  ring.castShadow = true;
  group.add(ring);
  // centre horizontally on the hang point so the keychain hangs straight
  if (tabX) for (const c of group.children) c.position.x -= tabX;

  const pivotY = tabY + 2 * R;          // top of the ring = hang point

  // measurements for price / print time
  const volume = bodyW * bodyH * 0.7 * t + (text ? text.length * 18 : 0);
  const printMinutes = Math.round(14 + volume / 95);

  function sync() {
    group.updateMatrixWorld(true);
    shared.uKeyInv.value.copy(group.matrixWorld).invert();
    shared.uKeyAxis.value.set(0, 0, 1).transformDirection(group.matrixWorld);
  }

  function dispose() {
    const all = new Set();
    group.traverse((c) => { if (c.isMesh) { c.geometry.dispose(); all.add(c.material); } });
    all.forEach((m) => m.dispose());
  }

  return {
    group, printable, uniforms: shared, sync, dispose, ring,
    meta: {
      width: bodyW, height: pivotY - bb.min.y,
      top: pivotY, bottom: bb.min.y, printTop: Math.max(bb.max.y, tabY + tabR) + 2.5, printBottom: bb.min.y - 1,
      printMinutes, volume,
    },
    options: o,
  };
}

// ---------- ready-made products ----------

export const PRODUCTS = [
  {
    id: 'miso-cat', name: 'Miso the cat', price: 279, blurb: 'Pink ears, tiny nose and a name banner you can change.',
    colors: ['tangerine', 'snow', 'ink'],
    build: (c) => ({ shape: 'cat', base: c, accent: 'lemon', text: 'Miso', finish: 'matte' }),
  },
  {
    id: 'night-shroom', name: 'Night shroom', price: 299, blurb: 'Glow-in-the-dark cap. Find your keys with the lights off.',
    colors: ['mint', 'pink', 'grape'],
    build: (c) => ({ shape: 'shroom', base: c, accent: 'snow', finish: 'glow' }),
  },
  {
    id: 'lucky-star', name: 'Lucky star', price: 249, blurb: 'Silk lemon with a pink heart. Shines in sunlight.',
    colors: ['lemon', 'mint', 'pink'],
    build: (c) => ({ shape: 'star', base: c, accent: 'pink', finish: 'silk',
      inlays: [{ type: 'shape', shape: () => heartShape(0.26), color: c === 'pink' ? 'snow' : 'pink', depth: 1.2 }] }),
  },
  {
    id: 'bobo-bear', name: 'Bobo bear', price: 279, blurb: 'Round ears, snout in your second colour. Very huggable.',
    colors: ['tangerine', 'grape', 'mint'],
    build: (c) => ({ shape: 'bear', base: c, accent: 'lemon', finish: 'matte' }),
  },
  {
    id: 'ghosty', name: 'Ghosty', price: 239, blurb: 'Soft white ghost with big eyes. Not scary.',
    colors: ['snow', 'lemon', 'pink'],
    build: (c) => ({ shape: 'ghost', base: c, accent: 'ink', finish: 'matte' }),
  },
  {
    id: 'good-day', name: 'Good day', price: 229, blurb: 'A smiley in two colours. Hard to be grumpy at.',
    colors: ['tangerine', 'lemon', 'ultra'],
    build: (c) => ({ shape: 'circle', base: c, accent: 'ink', finish: 'matte',
      inlays: [
        { type: 'circle', r: 2.6, x: -6.5, y: 5, color: 'eye' },
        { type: 'circle', r: 2.6, x: 6.5, y: 5, color: 'eye' },
        { type: 'smile', color: 'eye' },
      ] }),
  },
  {
    id: 'hop-bunny', name: 'Hop', price: 279, blurb: 'Long-eared bunny in silk filament with a soft shine.',
    colors: ['snow', 'pink', 'lemon'],
    build: (c) => ({ shape: 'bunny', base: c, accent: 'pink', finish: 'silk' }),
  },
  {
    id: 'big-heart', name: 'Big heart', price: 219, blurb: 'Galaxy filament with tiny sparkles in every layer.',
    colors: ['grape', 'pink', 'ink'],
    build: (c) => ({ shape: 'heart', base: c, accent: 'snow', finish: 'galaxy' }),
  },
  {
    id: 'blub-fish', name: 'Blub', price: 249, blurb: 'A little fish with two-colour fins. Swims on your keys.',
    colors: ['ultra', 'mint', 'tangerine'],
    build: (c) => ({ shape: 'fish', base: c, accent: c === 'mint' ? 'ultra' : 'lemon', finish: 'matte' }),
  },
];

// Quick-start designs for the studio.
export const PRESETS = [
  { label: 'Cat with a name', opts: { shape: 'cat', text: 'Zoya', base: 'lemon', accent: 'pink', font: 'bagel', finish: 'matte' } },
  { label: 'Glow shroom', opts: { shape: 'shroom', text: '', base: 'mint', accent: 'snow', finish: 'glow' } },
  { label: 'Name tag', opts: { shape: 'pill', text: 'Kabir', base: 'pink', accent: 'snow', font: 'bagel', finish: 'matte' } },
  { label: 'Silk bunny', opts: { shape: 'bunny', text: 'Mia', base: 'snow', accent: 'grape', font: 'pacifico', finish: 'silk' } },
  { label: 'Galaxy star', opts: { shape: 'star', text: '', base: 'ink', accent: 'lemon', finish: 'galaxy' } },
];

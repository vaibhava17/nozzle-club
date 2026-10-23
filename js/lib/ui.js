// Small UI helpers: toast, fly-to-cart, confetti, money.
import { gsap } from 'gsap';
import { reducedMotion } from './stage.js';

export const money = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

let toastTimer;
export function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), ms);
}

export function flyToCart(fromEl, color) {
  const target = document.getElementById('cartOpen');
  if (!fromEl || !target || reducedMotion) { bumpCart(); return; }
  const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.className = 'fly';
  dot.style.background = color;
  dot.style.left = a.left + a.width / 2 - 13 + 'px';
  dot.style.top = a.top + a.height / 2 - 13 + 'px';
  document.body.appendChild(dot);
  const dx = b.left + b.width - 30 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const tl = gsap.timeline({ onComplete: () => { dot.remove(); bumpCart(); } });
  tl.to(dot, { x: dx, duration: 0.8, ease: 'power1.inOut' }, 0)
    .to(dot, { keyframes: { y: [0, Math.min(-120, dy - 140), dy], easeEach: 'sine.inOut' }, duration: 0.8, ease: 'none' }, 0)
    .to(dot, { scale: 0.5, duration: 0.25, ease: 'power2.in' }, 0.55)
    .to(dot, { rotation: 540, duration: 0.8, ease: 'none' }, 0);
}

export function bumpCart() {
  const btn = document.getElementById('cartOpen');
  btn.classList.remove('bump');
  void btn.offsetWidth;
  btn.classList.add('bump');
}

const CONFETTI = ['#ff3ea5', '#ffe03a', '#22e3a6', '#ff6b1a', '#8b3dff', '#2d1bff'];
export function confetti(x = innerWidth / 2, y = innerHeight / 2, n = 70) {
  if (reducedMotion) return;
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    const s = 7 + Math.random() * 9;
    Object.assign(d.style, {
      position: 'fixed', left: x + 'px', top: y + 'px', width: s + 'px', height: s * (Math.random() > 0.5 ? 1 : 0.45) + 'px',
      background: CONFETTI[i % CONFETTI.length], borderRadius: Math.random() > 0.6 ? '50%' : '3px',
      zIndex: 90, pointerEvents: 'none', border: '1.5px solid #140f3f',
    });
    document.body.appendChild(d);
    const ang = Math.random() * Math.PI * 2, pow = 160 + Math.random() * 320;
    gsap.to(d, {
      x: Math.cos(ang) * pow, y: Math.sin(ang) * pow - 120,
      rotation: (Math.random() - 0.5) * 900, duration: 0.9 + Math.random() * 0.5, ease: 'power3.out',
    });
    gsap.to(d, { y: '+=' + (380 + Math.random() * 300), opacity: 0, duration: 1.1, delay: 0.75, ease: 'power2.in', onComplete: () => d.remove() });
  }
}

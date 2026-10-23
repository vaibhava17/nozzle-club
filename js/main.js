import { gsap } from 'gsap';
import Lenis from 'lenis';
import { preloadFonts } from './lib/fonts.js';
import { reducedMotion } from './lib/stage.js';
import { initCart } from './cart.js';
import { initHero } from './hero.js';
import { initShop } from './shop.js';
import { initStudio } from './studio.js';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// ---------- smooth scroll on the GSAP ticker (one RAF for everything) ----------
let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ duration: 1.2 });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -70, duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0 });
    else target.scrollIntoView();
    if (target) {
      const focusable = target.querySelector('h2');
      if (focusable) { focusable.setAttribute('tabindex', '-1'); focusable.focus({ preventScroll: true }); }
    }
  });
});

// nav turns solid once you leave the hero
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 40);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

initCart(lenis);

// ---------- the one orchestrated moment: headline lines stack up like printed layers ----------
const lines = [...document.querySelectorAll('.hero h1 .h1-line')].reverse();
if (!reducedMotion) {
  gsap.set(lines, { yPercent: 115, opacity: 0 });
  gsap.set(['.lede', '.try', '.hero-actions', '.hud'], { opacity: 0, y: 18 });
  const tl = gsap.timeline({ delay: 0.15 });
  tl.to(lines, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.14, ease: 'back.out(1.6)' })
    .to(['.lede', '.try', '.hero-actions'], { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, '-=0.3')
    .to('.hud', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '-=0.5');
}

const hero = initHero();
initShop();
initStudio();

preloadFonts().finally(() => hero.start());

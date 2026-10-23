// Cart state + drawer. Persists per browser (demo only).
import { money, toast, confetti, flyToCart } from './lib/ui.js';
import { FILAMENTS } from './lib/keychain.js';
import { markOpeningSoon, blockedWhileClosed } from './lib/shop-status.js';

const KEY = 'nozzle-club-cart-v1';
const FREE_SHIP = 999;
let items = load();
let lenisRef = null;
let lastFocus = null;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: cart lives for this visit */ }
}

const $ = (id) => document.getElementById(id);

export const cart = {
  add(item, fromEl) {
    if (blockedWhileClosed(fromEl)) return;   // shop not open yet: say so, change nothing
    const same = items.find((i) => i.key === item.key);
    if (same) same.qty += 1;
    else items.push({ ...item, qty: 1 });
    save(); render();
    flyToCart(fromEl, FILAMENTS[item.color]?.hex || item.color || '#ff3ea5');
    toast(`Added ${item.name} to your cart`);
  },
  setQty(key, qty) {
    const it = items.find((i) => i.key === key);
    if (!it) return;
    it.qty = qty;
    if (it.qty <= 0) items = items.filter((i) => i.key !== key);
    save(); render();
  },
  get count() { return items.reduce((n, i) => n + i.qty, 0); },
  get subtotal() { return items.reduce((n, i) => n + i.qty * i.price, 0); },
};

function render() {
  $('cartCount').textContent = cart.count;
  const list = $('cartItems');
  list.innerHTML = '';
  for (const it of items) {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-thumb" style="--c1:${FILAMENTS[it.color]?.hex || '#eee'}">${it.thumb ? `<img src="${it.thumb}" alt="" />` : ''}</div>
      <div>
        <h3></h3>
        <p></p>
        <div class="qty">
          <button type="button" data-d="-1" aria-label="Remove one">−</button>
          <span>${it.qty}</span>
          <button type="button" data-d="1" aria-label="Add one">+</button>
        </div>
      </div>
      <span class="line-price">${money(it.price * it.qty)}</span>`;
    li.querySelector('h3').textContent = it.name;
    li.querySelector('p').textContent = it.detail || '';
    li.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => cart.setQty(it.key, it.qty + Number(b.dataset.d))));
    list.appendChild(li);
  }
  const empty = items.length === 0;
  $('cartEmpty').hidden = !empty;
  $('cartFoot').hidden = empty;
  $('cartSubtotal').textContent = money(cart.subtotal);
  const left = Math.max(0, FREE_SHIP - cart.subtotal);
  $('shipText').textContent = left > 0 ? `Add ${money(left)} more for free shipping.` : 'Free shipping unlocked.';
  $('shipBar').style.width = Math.min(100, (cart.subtotal / FREE_SHIP) * 100) + '%';
}

function open() {
  lastFocus = document.activeElement;
  const el = $('cart'), scrim = $('scrim');
  scrim.hidden = false;
  requestAnimationFrame(() => { scrim.classList.add('is-open'); el.classList.add('is-open'); });
  el.setAttribute('aria-hidden', 'false');
  $('cartOpen').setAttribute('aria-expanded', 'true');
  lenisRef?.stop();
  setTimeout(() => $('cartClose').focus(), 50);
}
function close() {
  const el = $('cart'), scrim = $('scrim');
  el.classList.remove('is-open');
  scrim.classList.remove('is-open');
  el.setAttribute('aria-hidden', 'true');
  $('cartOpen').setAttribute('aria-expanded', 'false');
  setTimeout(() => { scrim.hidden = true; }, 300);
  lenisRef?.start();
  lastFocus?.focus?.();
}

export function initCart(lenis) {
  lenisRef = lenis;
  render();
  $('cartOpen').addEventListener('click', open);
  $('cartClose').addEventListener('click', close);
  $('scrim').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('cart').classList.contains('is-open')) close(); });
  document.querySelectorAll('[data-close-cart]').forEach((a) => a.addEventListener('click', close));
  markOpeningSoon($('checkoutBtn'), { tooltip: false });   // the note above it says it
  $('checkoutBtn').addEventListener('click', (e) => {
    if (blockedWhileClosed(e.currentTarget)) return;
    const r = e.currentTarget.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top);
    toast('This is a demo, so no payment was taken. Thanks for trying Nozzle Club!', 4200);
  });
}

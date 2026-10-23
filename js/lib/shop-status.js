// ---------------------------------------------------------------------------
// The one switch that opens the shop.
//
//   SHOP_OPEN = false -> "Opening soon" flags show up, add-to-cart and check out
//                        grey out and explain themselves instead of firing.
//   SHOP_OPEN = true  -> every flag below disappears on its own and ordering
//                        works exactly as before. Nothing else needs touching.
//
// Everything else in this file is driven by that constant: markup carrying
// data-shop-closed is revealed by initOpeningSoon(), commerce buttons are
// painted by markOpeningSoon(), and their clicks go through blockedWhileClosed().
// ---------------------------------------------------------------------------
import { toast } from './ui.js';

export const SHOP_OPEN = false;

export const SOON_LABEL = 'Opening soon';
const SOON_MESSAGE = 'Opening soon — we’re not taking orders yet. Keep designing: you can still download the STL.';

// Reveal (or remove) every bit of "opening soon" markup in one pass.
export function initOpeningSoon() {
  document.querySelectorAll('[data-shop-closed]').forEach((el) => { el.hidden = SHOP_OPEN; });
}

// Paint a commerce button as unavailable: greyed, not-allowed, hover tooltip.
// Pass tooltip:false where an inline note next to the button already says it.
export function markOpeningSoon(btn, { label = SOON_LABEL, tooltip = true } = {}) {
  if (SHOP_OPEN || !btn) return;
  btn.classList.add('is-soon');
  btn.setAttribute('aria-disabled', 'true');
  // nothing to add when the visible label already carries the message
  const saysItAlready = (btn.textContent || '').toLowerCase().includes(label.toLowerCase());
  if (saysItAlready) return;
  if (tooltip) btn.dataset.soon = label;
  btn.setAttribute('aria-label', `${btn.textContent.trim()} — ${label}`);
}

// Guard for every commerce action. Returns true when the click was blocked.
export function blockedWhileClosed(btn) {
  if (SHOP_OPEN) return false;
  toast(SOON_MESSAGE, 3800);
  if (btn) { btn.classList.remove('soon-nudge'); void btn.offsetWidth; btn.classList.add('soon-nudge'); }
  return true;
}

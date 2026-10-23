// Small silhouettes for the shape picker (viewBox 0 0 48 48, filled via CSS).
export const SHAPE_ICONS = {
  pill: '<rect x="3" y="15" width="42" height="18" rx="9"/>',
  circle: '<circle cx="24" cy="24" r="17"/>',
  star: '<polygon points="24,4 29.4,17.6 44,18 32.6,27.2 36.6,41.6 24,33.4 11.4,41.6 15.4,27.2 4,18 18.6,17.6" stroke-linejoin="round"/>',
  heart: '<path d="M24 42C8 31 4 23 4 16a9.5 9.5 0 0 1 20-4.5A9.5 9.5 0 0 1 44 16c0 7-4 15-20 26z"/>',
  hex: '<polygon points="24,4 41.3,14 41.3,34 24,44 6.7,34 6.7,14"/>',
  flower: '<circle cx="24" cy="24" r="11"/><circle cx="24" cy="10" r="8"/><circle cx="24" cy="38" r="8"/><circle cx="11.9" cy="17" r="8"/><circle cx="36.1" cy="17" r="8"/><circle cx="11.9" cy="31" r="8"/><circle cx="36.1" cy="31" r="8"/>',
  cat: '<path d="M8 38c-.6-8-.4-17 1.4-26l8.6 8h12l8.6-8c1.8 9 2 18 1.4 26-5 3-10 4-16 4s-11-1-16-4z"/>',
  bear: '<circle cx="24" cy="27" r="15"/><circle cx="11" cy="13" r="6.5"/><circle cx="37" cy="13" r="6.5"/>',
  bunny: '<circle cx="24" cy="33" r="12"/><ellipse cx="17.5" cy="14" rx="4.5" ry="11" transform="rotate(-10 17.5 14)"/><ellipse cx="30.5" cy="14" rx="4.5" ry="11" transform="rotate(10 30.5 14)"/>',
  fish: '<ellipse cx="19" cy="24" rx="15" ry="10.5"/><path d="M30 24l14-11v22z"/>',
  paw: '<ellipse cx="24" cy="31" rx="10" ry="8.5"/><circle cx="11.5" cy="20" r="4.4"/><circle cx="19" cy="12.5" r="4.4"/><circle cx="29" cy="12.5" r="4.4"/><circle cx="36.5" cy="20" r="4.4"/>',
  ghost: '<path d="M10 41V22a14 14 0 0 1 28 0v19l-4.7-3.6-4.6 3.6-4.7-3.6-4.7 3.6-4.6-3.6z"/>',
  shroom: '<path d="M5 25C5 14 13.5 6 24 6s19 8 19 19z"/><path d="M18.5 25h11l1 13.5a3 3 0 0 1-3 3.5h-7a3 3 0 0 1-3-3.5z"/>',
};

export const icon = (key) => `<svg viewBox="0 0 48 48" aria-hidden="true">${SHAPE_ICONS[key] || ''}</svg>`;

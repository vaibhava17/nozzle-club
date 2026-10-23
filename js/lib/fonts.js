// Loads fonts for 3D text. WOFF files are converted to three.js typeface data via TTFLoader (opentype.js).
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';

export const FONTS = {
  bagel:     { label: 'Chunky', url: 'assets/fonts/bagel.woff', kind: 'ttf' },
  helvetiker:{ label: 'Clean',  url: 'assets/fonts/helvetiker_bold.typeface.json', kind: 'json' },
  pacifico:  { label: 'Script', url: 'assets/fonts/pacifico.woff', kind: 'ttf' },
};

const cache = new Map();
const fontLoader = new FontLoader();

export function getFont(key) {
  const k = FONTS[key] ? key : 'helvetiker';
  if (cache.has(k)) return cache.get(k);
  const def = FONTS[k];
  const p = (async () => {
    try {
      if (def.kind === 'json') return await fontLoader.loadAsync(def.url);
      const json = await new TTFLoader().loadAsync(def.url);
      return fontLoader.parse(json);
    } catch (err) {
      console.warn(`Font "${k}" failed, falling back to Clean`, err);
      if (k !== 'helvetiker') return getFont('helvetiker');
      throw err;
    }
  })();
  cache.set(k, p);
  return p;
}

export const preloadFonts = () => Promise.all(Object.keys(FONTS).map(getFont));

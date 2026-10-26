// Procesado de píxeles puro (sin DOM) para poder testearlo en Node.
// Orden: claridad/nitidez -> balance de blancos + curva tonal -> HSL -> saturación/intensidad -> viñeta -> grano.

import { HSL_BANDS, isHslNeutral } from './params.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;

function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

// Curva tonal aplicada a un valor normalizado [0,1].
export function toneCurve(x, p) {
  x *= Math.pow(2, p.exposure);

  const black = (-p.blacks / 100) * 0.15;
  const white = 1 - (p.whites / 100) * 0.15;
  x = (x - black) / (white - black);

  x += (p.highlights / 100) * 0.25 * smoothstep(0.4, 1, x);
  x += (p.shadows / 100) * 0.25 * (1 - smoothstep(0, 0.6, x));

  const c = p.contrast / 100;
  x = clamp01(x);
  if (c > 0) x = lerp(x, smoothstep(0, 1, x), c);
  else if (c < 0) x = lerp(x, 0.5 + (x - 0.5) * 0.5, -c);

  const f = (p.fade / 100) * 0.12;
  x = f + x * (1 - f);

  return clamp01(x);
}

// LUT por canal que incluye temperatura/matiz + curva tonal.
export function buildToneLuts(p) {
  const t = p.temperature / 100;
  const tint = p.tint / 100;
  const mul = [1 + 0.15 * t + 0.04 * tint, 1 - 0.12 * tint, 1 - 0.15 * t + 0.04 * tint];
  const luts = mul.map(() => new Uint8ClampedArray(256));
  for (let c = 0; c < 3; c++) {
    for (let v = 0; v < 256; v++) {
      luts[c][v] = Math.round(toneCurve(clamp01((v / 255) * mul[c]), p) * 255);
    }
  }
  return luts;
}

// Para cada tono entero (0-359) precalcula el desplazamiento de tono,
// el multiplicador de saturación y el ajuste de luminancia del mezclador HSL.
export function buildHslLuts(hsl) {
  const centers = HSL_BANDS.map((b) => b.hue);
  const hueShift = new Float32Array(360);
  const satMul = new Float32Array(360);
  const lumAdd = new Float32Array(360);
  for (let h = 0; h < 360; h++) {
    let i = centers.length - 1;
    for (let k = 0; k < centers.length; k++) if (centers[k] <= h) i = k;
    const j = (i + 1) % centers.length;
    const start = centers[i];
    const end = j === 0 ? 360 : centers[j];
    const t = (h - start) / (end - start);
    const a = hsl[HSL_BANDS[i].id];
    const b = hsl[HSL_BANDS[j].id];
    hueShift[h] = lerp(a.h, b.h, t) * 0.3;
    satMul[h] = 1 + lerp(a.s, b.s, t) / 100;
    lumAdd[h] = (lerp(a.l, b.l, t) / 100) * 0.3;
  }
  return { hueShift, satMul, lumAdd };
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Aplica todos los ajustes sobre `data` (RGBA, se modifica en sitio).
 * `clarityBlur` y `sharpenBlur` son versiones desenfocadas de la misma imagen
 * (mismo tamaño) que se usan para el contraste local; son opcionales.
 */
export function processPixels(data, width, height, p, { clarityBlur = null, sharpenBlur = null, seed = 1337 } = {}) {
  const [lutR, lutG, lutB] = buildToneLuts(p);
  const useHsl = p.hsl && !isHslNeutral(p.hsl);
  const hslLuts = useHsl ? buildHslLuts(p.hsl) : null;

  const clarity = clarityBlur ? (p.clarity / 100) * 0.8 : 0;
  const sharpen = sharpenBlur ? (p.sharpen / 100) * 1.5 : 0;
  const sat = p.saturation / 100;
  const vib = p.vibrance / 100;
  const vignette = p.vignette / 100;
  const grain = (p.grain / 100) * 40;
  const rand = grain ? mulberry32(seed) : null;

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const ny = (y + 0.5 - cy) / cy;
    const ny2 = ny * ny;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (clarity) {
        // Contraste local concentrado en los medios tonos.
        const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const m = 1 - Math.pow(2 * l - 1, 2);
        const k = clarity * m;
        r += k * (r - clarityBlur[i]);
        g += k * (g - clarityBlur[i + 1]);
        b += k * (b - clarityBlur[i + 2]);
      }
      if (sharpen) {
        r += sharpen * (data[i] - sharpenBlur[i]);
        g += sharpen * (data[i + 1] - sharpenBlur[i + 1]);
        b += sharpen * (data[i + 2] - sharpenBlur[i + 2]);
      }

      r = lutR[r < 0 ? 0 : r > 255 ? 255 : Math.round(r)];
      g = lutG[g < 0 ? 0 : g > 255 ? 255 : Math.round(g)];
      b = lutB[b < 0 ? 0 : b > 255 ? 255 : Math.round(b)];

      if (useHsl) {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const d = max - min;
        if (d > 0.0001) {
          let l = (max + min) / 2;
          let s = d / (1 - Math.abs(2 * l - 1));
          let h;
          if (max === rn) h = ((gn - bn) / d) % 6;
          else if (max === gn) h = (bn - rn) / d + 2;
          else h = (rn - gn) / d + 4;
          h *= 60;
          if (h < 0) h += 360;
          const hi = Math.floor(h) % 360;
          const s0 = s;
          h = (h + hslLuts.hueShift[hi] + 360) % 360;
          s = clamp01(s * hslLuts.satMul[hi]);
          l = clamp01(l + hslLuts.lumAdd[hi] * s0);
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const pp = 2 * l - q;
          const hn = h / 360;
          r = hueToRgb(pp, q, hn + 1 / 3) * 255;
          g = hueToRgb(pp, q, hn) * 255;
          b = hueToRgb(pp, q, hn - 1 / 3) * 255;
        }
      }

      if (sat || vib) {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const s = (max - min) / 255;
        const amount = 1 + sat + vib * (1 - s);
        r = l + (r - l) * amount;
        g = l + (g - l) * amount;
        b = l + (b - l) * amount;
      }

      if (vignette) {
        const nx = (x + 0.5 - cx) / cx;
        const m = smoothstep(0.35, 1.05, Math.sqrt((nx * nx + ny2) / 2));
        if (vignette < 0) {
          const f = 1 + vignette * 0.85 * m;
          r *= f;
          g *= f;
          b *= f;
        } else {
          const f = vignette * 0.85 * m;
          r += (255 - r) * f;
          g += (255 - g) * f;
          b += (255 - b) * f;
        }
      }

      if (grain) {
        const n = (rand() - 0.5) * 2 * grain;
        r += n;
        g += n;
        b += n;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  return data;
}

export function computeHistogram(data, step = 4) {
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4 * step) {
    r[data[i]]++;
    g[data[i + 1]]++;
    b[data[i + 2]]++;
  }
  return { r, g, b };
}

// Definición de todos los ajustes del editor, agrupados como en Lightroom.

export const HSL_BANDS = [
  { id: 'red', label: 'Rojo', hue: 0, color: '#ef4444' },
  { id: 'orange', label: 'Naranja', hue: 30, color: '#f97316' },
  { id: 'yellow', label: 'Amarillo', hue: 60, color: '#eab308' },
  { id: 'green', label: 'Verde', hue: 120, color: '#22c55e' },
  { id: 'aqua', label: 'Aguamarina', hue: 180, color: '#06b6d4' },
  { id: 'blue', label: 'Azul', hue: 240, color: '#3b82f6' },
  { id: 'purple', label: 'Morado', hue: 280, color: '#a855f7' },
  { id: 'magenta', label: 'Magenta', hue: 320, color: '#ec4899' },
];

export const SECTIONS = [
  {
    id: 'light',
    label: 'Luz',
    controls: [
      { key: 'exposure', label: 'Exposición', min: -3, max: 3, step: 0.05, format: (v) => (v > 0 ? '+' : '') + v.toFixed(2) },
      { key: 'contrast', label: 'Contraste', min: -100, max: 100 },
      { key: 'highlights', label: 'Iluminaciones', min: -100, max: 100 },
      { key: 'shadows', label: 'Sombras', min: -100, max: 100 },
      { key: 'whites', label: 'Blancos', min: -100, max: 100 },
      { key: 'blacks', label: 'Negros', min: -100, max: 100 },
    ],
  },
  {
    id: 'color',
    label: 'Color',
    controls: [
      { key: 'temperature', label: 'Temperatura', min: -100, max: 100, track: 'linear-gradient(90deg,#3b82f6,#e5e5e5,#f59e0b)' },
      { key: 'tint', label: 'Matiz', min: -100, max: 100, track: 'linear-gradient(90deg,#22c55e,#e5e5e5,#d946ef)' },
      { key: 'vibrance', label: 'Intensidad', min: -100, max: 100 },
      { key: 'saturation', label: 'Saturación', min: -100, max: 100 },
    ],
  },
  {
    id: 'effects',
    label: 'Efectos',
    controls: [
      { key: 'clarity', label: 'Claridad', min: -100, max: 100 },
      { key: 'sharpen', label: 'Nitidez', min: 0, max: 100 },
      { key: 'fade', label: 'Desvanecer', min: 0, max: 100 },
      { key: 'vignette', label: 'Viñeta', min: -100, max: 100 },
      { key: 'grain', label: 'Grano', min: 0, max: 100 },
    ],
  },
];

export const CROP_RATIOS = [
  { id: 'original', label: 'Original', ratio: null, export: { long: 2048 } },
  { id: '4:5', label: '4:5 Feed', ratio: 4 / 5, export: { w: 1080, h: 1350 } },
  { id: '1:1', label: '1:1 Post', ratio: 1, export: { w: 1080, h: 1080 } },
  { id: '9:16', label: '9:16 Story/Reel', ratio: 9 / 16, export: { w: 1080, h: 1920 } },
  { id: '16:9', label: '16:9 YouTube', ratio: 16 / 9, export: { w: 1920, h: 1080 } },
];

export function defaultHsl() {
  const hsl = {};
  for (const b of HSL_BANDS) hsl[b.id] = { h: 0, s: 0, l: 0 };
  return hsl;
}

export function defaultParams() {
  return {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    saturation: 0,
    clarity: 0,
    sharpen: 0,
    fade: 0,
    vignette: 0,
    grain: 0,
    hsl: defaultHsl(),
  };
}

export function defaultCrop() {
  return { ratio: 'original', zoom: 1, x: 0.5, y: 0.5, rotation: 0, flipH: false };
}

// Mezcla un preset (parcial) sobre los valores por defecto.
export function withDefaults(partial = {}) {
  const base = defaultParams();
  const hsl = defaultHsl();
  for (const [band, v] of Object.entries(partial.hsl || {})) {
    if (hsl[band]) hsl[band] = { ...hsl[band], ...v };
  }
  return { ...base, ...partial, hsl };
}

export function isHslNeutral(hsl) {
  return Object.values(hsl).every((b) => !b.h && !b.s && !b.l);
}

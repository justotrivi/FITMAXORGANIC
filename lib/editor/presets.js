// Presets pensados para la estética de FITMAXORGANIC (natural, orgánico, fitness).
// Solo incluyen los valores que cambian; el resto queda en 0.

import { LOOKS } from './looks.js';

export const BUILT_IN_PRESETS = [
  { id: 'natural', name: 'Natural', params: {} },
  ...LOOKS.map(({ id, name, params }) => ({ id, name, params })),
  {
    id: 'organic-warm',
    name: 'Orgánico Cálido',
    params: {
      exposure: 0.1, contrast: 10, highlights: -25, shadows: 20, temperature: 18, tint: 4,
      vibrance: 20, saturation: -5, fade: 10, vignette: -10,
      hsl: { orange: { s: 5, l: 8 }, green: { h: -10, s: -10 } },
    },
  },
  {
    id: 'fitness-punch',
    name: 'Fitness Punch',
    params: {
      contrast: 35, highlights: -30, shadows: 15, blacks: -15, vibrance: 15,
      clarity: 40, sharpen: 30, vignette: -20,
      hsl: { orange: { s: 10, l: 5 } },
    },
  },
  {
    id: 'fresh-green',
    name: 'Verde Fresco',
    params: {
      exposure: 0.1, shadows: 15, temperature: -5, tint: -6, vibrance: 30, saturation: 5,
      hsl: { green: { h: 8, s: 25, l: 5 }, yellow: { h: 10, s: 10 } },
    },
  },
  {
    id: 'matte-lifestyle',
    name: 'Mate Lifestyle',
    params: {
      contrast: -10, highlights: -20, shadows: 10, temperature: 10, saturation: -15, fade: 35,
    },
  },
  {
    id: 'moody-gym',
    name: 'Moody Gym',
    params: {
      exposure: -0.2, contrast: 25, highlights: -40, shadows: -10, temperature: -10, saturation: -25,
      clarity: 30, vignette: -35, grain: 15,
      hsl: { orange: { s: 15 }, blue: { s: -30, l: -15 } },
    },
  },
  {
    id: 'bw-athletic',
    name: 'B&N Atlético',
    params: { contrast: 40, blacks: -10, saturation: -100, clarity: 35, sharpen: 20, grain: 20, vignette: -15 },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    params: {
      exposure: 0.15, contrast: 5, highlights: -35, shadows: 25, temperature: 35, tint: 8,
      vibrance: 25, fade: 8, vignette: -15,
      hsl: { orange: { s: 15 }, yellow: { h: -10, s: 10 }, blue: { s: -20 } },
    },
  },
];

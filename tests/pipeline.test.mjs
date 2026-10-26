import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processPixels, toneCurve, buildHslLuts, computeHistogram } from '../lib/editor/pipeline.js';
import { defaultParams, withDefaults } from '../lib/editor/params.js';
import { BUILT_IN_PRESETS } from '../lib/editor/presets.js';

function image(pixels) {
  return new Uint8ClampedArray(pixels.flatMap(([r, g, b]) => [r, g, b, 255]));
}

const SAMPLE = [[10, 20, 30], [128, 128, 128], [200, 120, 60], [40, 180, 70], [250, 250, 250], [0, 0, 0]];

test('los ajustes por defecto no cambian la imagen', () => {
  const data = image(SAMPLE);
  const copy = data.slice();
  processPixels(data, SAMPLE.length, 1, defaultParams());
  assert.deepEqual(data, copy);
});

test('la exposición positiva aclara y la negativa oscurece', () => {
  const p = defaultParams();
  assert.ok(toneCurve(0.4, { ...p, exposure: 1 }) > 0.4);
  assert.ok(toneCurve(0.4, { ...p, exposure: -1 }) < 0.4);
});

test('la curva tonal es monótona con contraste y sombras', () => {
  const p = withDefaults({ contrast: 60, shadows: 50, highlights: -50, whites: 30, blacks: -30 });
  let prev = -1;
  for (let i = 0; i <= 255; i++) {
    const v = toneCurve(i / 255, p);
    assert.ok(v >= prev - 1e-9, `no monótona en ${i}`);
    prev = v;
  }
});

test('temperatura cálida sube el rojo y baja el azul', () => {
  const data = image([[128, 128, 128]]);
  processPixels(data, 1, 1, withDefaults({ temperature: 50 }));
  assert.ok(data[0] > 128 && data[2] < 128);
});

test('saturación -100 da blanco y negro', () => {
  const data = image([[200, 120, 60]]);
  processPixels(data, 1, 1, withDefaults({ saturation: -100 }));
  assert.ok(Math.abs(data[0] - data[1]) <= 1 && Math.abs(data[1] - data[2]) <= 1);
});

test('HSL: subir la saturación de verdes no toca los rojos', () => {
  const luts = buildHslLuts(withDefaults({ hsl: { green: { s: 100 } } }).hsl);
  assert.equal(luts.satMul[120], 2);
  assert.equal(luts.satMul[0], 1);
  const data = image([[200, 40, 40], [60, 160, 60]]);
  processPixels(data, 2, 1, withDefaults({ hsl: { green: { s: 80 } } }));
  assert.deepEqual([...data.slice(0, 3)], [200, 40, 40]);
  assert.ok(data[5] - data[4] > 100 - 0);
});

test('la viñeta negativa oscurece las esquinas y no el centro', () => {
  const w = 21;
  const data = image(Array.from({ length: w * w }, () => [128, 128, 128]));
  processPixels(data, w, w, withDefaults({ vignette: -100 }));
  const at = (x, y) => data[(y * w + x) * 4];
  assert.equal(at(10, 10), 128);
  assert.ok(at(0, 0) < 60);
});

test('todos los presets producen valores válidos', () => {
  for (const preset of BUILT_IN_PRESETS) {
    const data = image(SAMPLE);
    processPixels(data, SAMPLE.length, 1, withDefaults(preset.params), { clarityBlur: data.slice(), sharpenBlur: data.slice() });
    for (const v of data) assert.ok(Number.isFinite(v) && v >= 0 && v <= 255, preset.name);
  }
});

test('histograma cuenta los píxeles', () => {
  const h = computeHistogram(image([[0, 0, 0], [255, 255, 255]]), 1);
  assert.equal(h.r[0], 1);
  assert.equal(h.b[255], 1);
});

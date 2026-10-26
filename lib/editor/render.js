// Funciones que usan canvas: cargar, orientar, recortar, procesar y exportar.

import { CROP_RATIOS } from './params.js';
import { processPixels } from './pipeline.js';

export const PREVIEW_MAX_SIDE = 1400;

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo abrir ${file.name}`));
    };
    img.src = url;
  });
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Devuelve un canvas con la imagen girada/volteada y reducida a `maxSide` como máximo.
export function orientSource(img, { rotation = 0, flipH = false }, maxSide = Infinity) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(1, maxSide / Math.max(iw, ih));
  const w = iw * scale;
  const h = ih * scale;
  const swap = rotation % 180 !== 0;
  const canvas = makeCanvas(swap ? h : w, swap ? w : h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (flipH) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return canvas;
}

export function getRatio(id) {
  return CROP_RATIOS.find((r) => r.id === id) || CROP_RATIOS[0];
}

// Rectángulo de recorte en píxeles de la fuente orientada.
export function computeCropRect(srcW, srcH, crop) {
  const ratio = getRatio(crop.ratio).ratio ?? srcW / srcH;
  let sw;
  let sh;
  if (srcW / srcH > ratio) {
    sh = srcH;
    sw = srcH * ratio;
  } else {
    sw = srcW;
    sh = srcW / ratio;
  }
  sw /= crop.zoom;
  sh /= crop.zoom;
  return { sx: (srcW - sw) * crop.x, sy: (srcH - sh) * crop.y, sw, sh };
}

export function exportSize(rect, crop, maxQuality) {
  if (maxQuality) return { w: Math.round(rect.sw), h: Math.round(rect.sh) };
  const spec = getRatio(crop.ratio).export;
  if (spec.w) return { w: spec.w, h: spec.h };
  const s = Math.min(1, spec.long / Math.max(rect.sw, rect.sh));
  return { w: Math.round(rect.sw * s), h: Math.round(rect.sh * s) };
}

// Desenfoque barato: se reduce la imagen y se vuelve a ampliar con suavizado.
function blurredData(canvas, smallW, smallH) {
  const small = makeCanvas(smallW, smallH);
  const sctx = small.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  const big = makeCanvas(canvas.width, canvas.height);
  const bctx = big.getContext('2d');
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, big.width, big.height);
  return bctx.getImageData(0, 0, big.width, big.height).data;
}

/**
 * Dibuja el recorte de `source` en `target` con tamaño outW x outH y aplica los ajustes.
 * Si `original` es true no aplica ajustes (vista "antes").
 */
export function renderTo(target, source, crop, params, outW, outH, { original = false } = {}) {
  target.width = Math.max(1, Math.round(outW));
  target.height = Math.max(1, Math.round(outH));
  const ctx = target.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  const { sx, sy, sw, sh } = computeCropRect(source.width, source.height, crop);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, target.width, target.height);
  const imageData = ctx.getImageData(0, 0, target.width, target.height);
  if (original) return imageData;

  const minSide = Math.min(target.width, target.height);
  const clarityBlur = params.clarity
    ? blurredData(target, (target.width * 40) / minSide, (target.height * 40) / minSide)
    : null;
  const sharpenBlur = params.sharpen ? blurredData(target, target.width / 2, target.height / 2) : null;

  processPixels(imageData.data, target.width, target.height, params, { clarityBlur, sharpenBlur });
  ctx.putImageData(imageData, 0, 0);
  return imageData;
}

export async function exportPhoto(photo, { maxQuality = false, quality = 0.92 } = {}) {
  const source = orientSource(photo.img, photo.crop);
  const rect = computeCropRect(source.width, source.height, photo.crop);
  const { w, h } = exportSize(rect, photo.crop, maxQuality);
  const canvas = makeCanvas(w, h);
  renderTo(canvas, source, photo.crop, photo.params, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  const base = photo.name.replace(/\.[^.]+$/, '');
  const suffix = photo.crop.ratio === 'original' ? '' : `_${photo.crop.ratio.replace(':', 'x')}`;
  return { blob, filename: `${base}_fitmax${suffix}.jpg`, width: w, height: h };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

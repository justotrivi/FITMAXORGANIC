'use client';

import { useEffect, useRef } from 'react';

export default function Histogram({ histogram }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    if (!histogram) return;
    let peak = 1;
    // Ignora los extremos para que un fondo blanco/negro no aplaste el gráfico.
    for (const ch of ['r', 'g', 'b']) for (let i = 2; i < 254; i++) peak = Math.max(peak, histogram[ch][i]);
    ctx.globalCompositeOperation = 'lighter';
    const colors = { r: 'rgba(239,68,68,0.55)', g: 'rgba(34,197,94,0.55)', b: 'rgba(59,130,246,0.55)' };
    for (const ch of ['r', 'g', 'b']) {
      ctx.fillStyle = colors[ch];
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < 256; i++) {
        const v = Math.min(1, histogram[ch][i] / peak);
        ctx.lineTo((i / 255) * w, h - v * h);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [histogram]);

  return (
    <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
      <canvas ref={ref} width={256} height={80} className="w-full h-20 rounded bg-black/40" aria-label="Histograma" />
    </div>
  );
}

'use client';

import { CROP_RATIOS } from '@/lib/editor/params';
import Slider from './Slider';

export default function CropPanel({ crop, onChange }) {
  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <p className="text-[12px] text-white/50 mb-2">Formato</p>
        <div className="grid grid-cols-2 gap-1.5">
          {CROP_RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange({ ...crop, ratio: r.id, x: 0.5, y: 0.5, zoom: 1 })}
              className={`text-[12px] py-2 rounded-md border transition-colors ${
                crop.ratio === r.id
                  ? 'border-[#22d3ee]/60 text-[#22d3ee] bg-[#22d3ee]/5'
                  : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <Slider
        label="Zoom"
        value={crop.zoom}
        min={1}
        max={4}
        step={0.01}
        defaultValue={1}
        format={(v) => v.toFixed(2) + '×'}
        onChange={(zoom) => onChange({ ...crop, zoom })}
      />

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ ...crop, rotation: (crop.rotation + 270) % 360, x: 0.5, y: 0.5 })}
          className="text-[12px] py-2 rounded-md border border-white/10 text-white/60 hover:border-white/30 hover:text-white"
        >
          ↺ Girar
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...crop, rotation: (crop.rotation + 90) % 360, x: 0.5, y: 0.5 })}
          className="text-[12px] py-2 rounded-md border border-white/10 text-white/60 hover:border-white/30 hover:text-white"
        >
          ↻ Girar
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...crop, flipH: !crop.flipH })}
          className={`text-[12px] py-2 rounded-md border col-span-2 ${
            crop.flipH ? 'border-[#22d3ee]/60 text-[#22d3ee]' : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
          }`}
        >
          ⇋ Voltear horizontal
        </button>
      </div>

      <p className="text-[11px] text-white/30 leading-relaxed">
        Arrastra la foto para encuadrar. El formato define también el tamaño de exportación
        (por ejemplo 4:5 → 1080×1350 para el feed de Instagram).
      </p>
    </div>
  );
}

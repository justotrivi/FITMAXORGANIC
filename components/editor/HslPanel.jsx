'use client';

import { useState } from 'react';
import { HSL_BANDS } from '@/lib/editor/params';
import Slider from './Slider';

const MODES = [
  { id: 'h', label: 'Tono' },
  { id: 's', label: 'Saturación' },
  { id: 'l', label: 'Luminancia' },
];

export default function HslPanel({ hsl, onChange }) {
  const [mode, setMode] = useState('s');
  return (
    <div>
      <div className="flex gap-1 mb-2 bg-white/5 rounded-md p-0.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`flex-1 text-[11px] py-1 rounded ${mode === m.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {HSL_BANDS.map((band) => (
        <Slider
          key={band.id}
          name={band.label}
          label={
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: band.color }} />
              {band.label}
            </span>
          }
          value={hsl[band.id][mode]}
          min={-100}
          max={100}
          onChange={(v) => onChange({ ...hsl, [band.id]: { ...hsl[band.id], [mode]: v } })}
        />
      ))}
    </div>
  );
}

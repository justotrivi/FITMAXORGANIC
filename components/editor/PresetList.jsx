'use client';

import { BUILT_IN_PRESETS } from '@/lib/editor/presets';

function PresetButton({ preset, active, onApply, onDelete }) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onApply(preset)}
        className={`w-full text-left text-[13px] px-3 py-2 rounded-md transition-colors ${
          active ? 'bg-[#22d3ee]/10 text-[#22d3ee]' : 'text-white/60 hover:bg-white/5 hover:text-white'
        }`}
      >
        {preset.name}
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(preset.id)}
          aria-label={`Eliminar preset ${preset.name}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function PresetList({ activePresetId, userPresets, onApply, onSave, onDelete, disabled }) {
  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
      <h2 className="px-4 pt-4 pb-2 text-[12px] font-semibold uppercase tracking-wider text-white/70">Presets</h2>
      <div className="px-2 space-y-0.5">
        {BUILT_IN_PRESETS.map((p) => (
          <PresetButton key={p.id} preset={p} active={activePresetId === p.id} onApply={onApply} />
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-white/70">Mis presets</h2>
        <button type="button" onClick={onSave} className="text-[11px] text-[#22d3ee] hover:text-[#e5ff33]">
          + Guardar actual
        </button>
      </div>
      <div className="px-2 space-y-0.5 pb-4">
        {userPresets.length === 0 && (
          <p className="px-3 text-[12px] text-white/25">Guarda tus ajustes para reutilizarlos en todas tus fotos.</p>
        )}
        {userPresets.map((p) => (
          <PresetButton key={p.id} preset={p} active={activePresetId === p.id} onApply={onApply} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

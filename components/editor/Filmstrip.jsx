'use client';

export default function Filmstrip({ photos, activeId, onSelect, onRemove }) {
  if (photos.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-thin px-4 py-3 border-t border-white/[0.06] bg-[#050505]">
      {photos.map((p) => (
        <div key={p.id} className="relative group shrink-0">
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            className={`block w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${
              p.id === activeId ? 'border-[#22d3ee]' : 'border-transparent hover:border-white/30'
            }`}
            title={p.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
          </button>
          {p.edited && <span className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-[#22d3ee]" title="Editada" />}
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            aria-label={`Quitar ${p.name}`}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black border border-white/20 text-white/60 text-[11px] leading-none opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-400"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';

export default function Section({ title, children, defaultOpen = true, onReset, dirty = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-white/70 hover:text-white"
          aria-expanded={open}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? 'rotate-90' : ''}`}>
            <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          {title}
          {dirty && <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />}
        </button>
        {onReset && dirty && (
          <button type="button" onClick={onReset} className="text-[11px] text-white/30 hover:text-[#22d3ee]">
            Restablecer
          </button>
        )}
      </div>
      {open && <div className="px-4 pb-3">{children}</div>}
    </section>
  );
}

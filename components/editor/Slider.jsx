'use client';

export default function Slider({ label, name, value, min, max, step = 1, onChange, format, track, defaultValue = 0 }) {
  const display = format ? format(value) : (value > 0 ? '+' : '') + Math.round(value);
  const changed = value !== defaultValue;
  const ariaName = typeof label === 'string' ? label : name;
  return (
    <div className="group py-1">
      <div className="flex items-center justify-between text-[12px] mb-0.5">
        <button
          type="button"
          onDoubleClick={() => onChange(defaultValue)}
          title="Doble clic para restablecer"
          className={`select-none text-left ${changed ? 'text-white/90' : 'text-white/50'} hover:text-white transition-colors`}
        >
          {label}
        </button>
        <input
          type="number"
          value={step < 1 ? value.toFixed(2) : Math.round(value)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          aria-label={`${ariaName} valor`}
          className="w-14 bg-transparent text-right tabular-nums text-white/60 focus:text-white focus:outline-none focus:bg-white/5 rounded px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          title={display}
        />
      </div>
      <input
        type="range"
        className="lr-slider"
        style={track ? { '--track': track } : undefined}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaName}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onDoubleClick={() => onChange(defaultValue)}
      />
    </div>
  );
}

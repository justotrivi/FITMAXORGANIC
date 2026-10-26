'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SECTIONS, defaultCrop, defaultParams, defaultHsl, isHslNeutral, withDefaults } from '@/lib/editor/params';
import { computeHistogram } from '@/lib/editor/pipeline';
import {
  PREVIEW_MAX_SIDE,
  computeCropRect,
  downloadBlob,
  exportPhoto,
  getRatio,
  loadImage,
  orientSource,
  renderTo,
} from '@/lib/editor/render';
import Slider from './Slider';
import Section from './Section';
import Histogram from './Histogram';
import HslPanel from './HslPanel';
import PresetList from './PresetList';
import CropPanel from './CropPanel';
import Filmstrip from './Filmstrip';

const PRESETS_KEY = 'fitmax.userPresets';
const DEFAULTS_JSON = JSON.stringify(defaultParams());

const isEdited = (p) => JSON.stringify(p.params) !== DEFAULTS_JSON || JSON.stringify(p.crop) !== JSON.stringify(defaultCrop());
const DISCRETE = { discrete: true };
const snapshot = (p) => ({ params: p.params, crop: p.crop, presetId: p.presetId });

let nextId = 1;

export default function PhotoEditor() {
  const [photos, setPhotos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState('edit');
  const [showBefore, setShowBefore] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [userPresets, setUserPresets] = useState([]);
  const [maxQuality, setMaxQuality] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [histogram, setHistogram] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [previewDims, setPreviewDims] = useState(null);

  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const photosRef = useRef(photos);
  const historyRef = useRef({});
  const lastChangeRef = useRef({});
  const frameRef = useRef(0);
  const panRef = useRef(null);
  const toastTimerRef = useRef(0);

  photosRef.current = photos;
  const active = photos.find((p) => p.id === activeId) || null;

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ---------- Presets guardados ----------
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');
      if (Array.isArray(saved)) setUserPresets(saved);
    } catch {
      /* sin almacenamiento disponible */
    }
  }, []);

  const persistPresets = (list) => {
    setUserPresets(list);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
    } catch {
      notify('No se pudo guardar el preset en este navegador');
    }
  };

  // ---------- Historial y actualizaciones ----------
  // `discrete`: acciones puntuales (preset, pegar, girar...) que siempre crean su propio paso de historial.
  const updatePhotos = useCallback((ids, makePatch, { discrete = false } = {}) => {
    const now = Date.now();
    const current = photosRef.current;
    for (const id of ids) {
      const photo = current.find((p) => p.id === id);
      if (!photo) continue;
      const h = (historyRef.current[id] ||= { past: [], future: [] });
      // Agrupa los cambios seguidos (p. ej. arrastrar un slider) en un solo paso de historial.
      if (discrete || now - (lastChangeRef.current[id] || 0) > 600) {
        h.past.push(snapshot(photo));
        if (h.past.length > 100) h.past.shift();
        h.future = [];
      }
      lastChangeRef.current[id] = discrete ? 0 : now;
    }
    setPhotos((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, ...makePatch(p) } : p)));
  }, []);

  const update = useCallback(
    (makePatch, opts) => active && updatePhotos([active.id], makePatch, opts),
    [active, updatePhotos],
  );

  const setParam = (key, value) => update((p) => ({ params: { ...p.params, [key]: value }, presetId: null }));

  const travel = useCallback(
    (direction) => {
      if (!active) return;
      const h = historyRef.current[active.id];
      const from = direction === 'undo' ? h?.past : h?.future;
      const to = direction === 'undo' ? h?.future : h?.past;
      if (!from?.length) return;
      to.push(snapshot(active));
      const snap = from.pop();
      lastChangeRef.current[active.id] = 0;
      setPhotos((ps) => ps.map((p) => (p.id === active.id ? { ...p, ...snap } : p)));
    },
    [active],
  );

  // ---------- Importar ----------
  const addFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif)$/i.test(f.name));
      if (!files.length) {
        notify('Selecciona archivos de imagen (JPG, PNG, WEBP)');
        return;
      }
      const loaded = [];
      for (const file of files) {
        try {
          const { img, url } = await loadImage(file);
          loaded.push({
            id: `p${nextId++}`,
            name: file.name,
            url,
            img,
            params: defaultParams(),
            crop: defaultCrop(),
            presetId: 'natural',
          });
        } catch (e) {
          notify(`${e.message}. Si es HEIC, expórtala primero como JPG.`);
        }
      }
      if (!loaded.length) return;
      setPhotos((ps) => [...ps, ...loaded]);
      setActiveId((id) => id ?? loaded[0].id);
    },
    [notify],
  );

  const removePhoto = (id) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    delete historyRef.current[id];
    const rest = photos.filter((p) => p.id !== id);
    setPhotos(rest);
    if (id === activeId) setActiveId(rest[0]?.id ?? null);
  };

  // ---------- Vista previa ----------
  const rotation = active?.crop.rotation;
  const flipH = active?.crop.flipH;
  const previewSource = useMemo(
    () => (active ? orientSource(active.img, { rotation, flipH }, PREVIEW_MAX_SIDE) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active?.img, rotation, flipH],
  );

  useEffect(() => {
    if (!active || !previewSource || !canvasRef.current) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const rect = computeCropRect(previewSource.width, previewSource.height, active.crop);
      const imageData = renderTo(canvasRef.current, previewSource, active.crop, active.params, rect.sw, rect.sh, {
        original: showBefore,
      });
      setHistogram(computeHistogram(imageData.data));
      setPreviewDims((d) => (d?.w === imageData.width && d?.h === imageData.height ? d : { w: imageData.width, h: imageData.height }));
    });
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, previewSource, showBefore]);

  // Tamaño del área de vista previa, para encajar la foto sin deformarla.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [active !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const fit = previewDims && stageSize.w > 0 ? Math.min(stageSize.w / previewDims.w, stageSize.h / previewDims.h) : 0;
  const displaySize = fit ? { width: Math.floor(previewDims.w * fit), height: Math.floor(previewDims.h * fit) } : undefined;

  // Arrastrar para encuadrar en modo recorte.
  const onPointerDown = (e) => {
    if (tab !== 'crop' || !active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, crop: active.crop };
  };
  const onPointerMove = (e) => {
    const pan = panRef.current;
    if (!pan || !previewSource) return;
    const box = e.currentTarget.getBoundingClientRect();
    const rect = computeCropRect(previewSource.width, previewSource.height, pan.crop);
    const pxPerScreen = rect.sw / box.width;
    const freeX = previewSource.width - rect.sw;
    const freeY = previewSource.height - rect.sh;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const x = freeX > 0.5 ? clamp(pan.crop.x - ((e.clientX - pan.x) * pxPerScreen) / freeX) : 0.5;
    const y = freeY > 0.5 ? clamp(pan.crop.y - ((e.clientY - pan.y) * pxPerScreen) / freeY) : 0.5;
    update((p) => ({ crop: { ...p.crop, x, y } }));
  };
  const onPointerUp = () => {
    panRef.current = null;
  };

  // ---------- Presets y sincronización ----------
  const applyPreset = (preset) => update(() => ({ params: withDefaults(preset.params), presetId: preset.id }), DISCRETE);

  const savePreset = () => {
    if (!active) return;
    const name = window.prompt('Nombre del preset', 'Mi preset FitMax');
    if (!name?.trim()) return;
    const preset = { id: `u${Date.now()}`, name: name.trim(), params: active.params };
    persistPresets([...userPresets, preset]);
    update(() => ({ presetId: preset.id }));
    notify(`Preset “${preset.name}” guardado`);
  };

  const copySettings = useCallback(() => {
    if (!active) return;
    setClipboard({ params: active.params, presetId: active.presetId });
    notify('Ajustes copiados');
  }, [active, notify]);

  const pasteSettings = useCallback(() => {
    if (!active || !clipboard) return;
    update(() => ({ ...clipboard }), DISCRETE);
    notify('Ajustes pegados');
  }, [active, clipboard, update, notify]);

  const syncAll = () => {
    if (!active) return;
    const others = photos.filter((p) => p.id !== active.id).map((p) => p.id);
    if (!others.length) return;
    updatePhotos(others, () => ({ params: active.params, presetId: active.presetId }), DISCRETE);
    notify(`Ajustes aplicados a ${others.length} foto${others.length > 1 ? 's' : ''} (el recorte no se copia)`);
  };

  const resetAll = () => update(() => ({ params: defaultParams(), presetId: 'natural' }), DISCRETE);

  // ---------- Exportar ----------
  const exportOne = async (photo) => {
    const { blob, filename, width, height } = await exportPhoto(photo, { maxQuality });
    downloadBlob(blob, filename);
    return `${filename} (${width}×${height})`;
  };

  const exportActive = async () => {
    if (!active) return;
    setBusy(true);
    try {
      notify(`Exportada: ${await exportOne(active)}`);
    } catch (e) {
      notify(`Error al exportar: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const exportAll = async () => {
    setBusy(true);
    try {
      for (const p of photos) {
        await exportOne(p);
        await new Promise((r) => setTimeout(r, 350));
      }
      notify(`${photos.length} fotos exportadas`);
    } catch (e) {
      notify(`Error al exportar: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Atajos de teclado (como en Lightroom) ----------
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' && e.target.type !== 'range') return;
      if (tag === 'TEXTAREA') return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === '\\') {
        e.preventDefault();
        setShowBefore((v) => !v);
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        travel(e.shiftKey ? 'redo' : 'undo');
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySettings();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteSettings();
      } else if (!mod && e.key.toLowerCase() === 'r') {
        setTab((t) => (t === 'crop' ? 'edit' : 'crop'));
      } else if (!mod && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && tag !== 'INPUT') {
        const idx = photosRef.current.findIndex((p) => p.id === activeId);
        const next = photosRef.current[idx + (e.key === 'ArrowRight' ? 1 : -1)];
        if (next) setActiveId(next.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [travel, copySettings, pasteSettings, activeId]);

  // ---------- Render ----------
  const sectionDirty = (section) => section.controls.some((c) => active?.params[c.key] !== 0);
  const resetSection = (section) =>
    update((p) => {
      const params = { ...p.params };
      for (const c of section.controls) params[c.key] = 0;
      return { params, presetId: null };
    }, DISCRETE);
  const history = active ? historyRef.current[active.id] : null;

  return (
    <div
      className="h-screen flex flex-col bg-[#030303] text-white overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      {/* Barra superior */}
      <header className="flex items-center gap-2 sm:gap-3 px-4 h-14 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-md bg-[#22d3ee]/10 border border-[#22d3ee]/20 flex items-center justify-center text-[#22d3ee] text-xs font-bold">
            FM
          </div>
          <span className="font-semibold tracking-tight hidden sm:inline">FitMax Studio</span>
          <span className="text-white/30 text-sm hidden md:inline">· Editor de fotos para redes</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="whitespace-nowrap text-[13px] px-3 py-1.5 rounded-md border border-white/10 text-white/80 hover:border-white/30 hover:text-white"
        >
          Importar<span className="hidden sm:inline"> fotos</span>
        </button>
        {active && (
          <>
            <label className="hidden md:flex items-center gap-1.5 text-[12px] text-white/50 cursor-pointer select-none">
              <input type="checkbox" checked={maxQuality} onChange={(e) => setMaxQuality(e.target.checked)} className="accent-[#22d3ee]" />
              Máxima resolución
            </label>
            {photos.length > 1 && (
              <button
                type="button"
                disabled={busy}
                onClick={exportAll}
                className="whitespace-nowrap text-[13px] px-3 py-1.5 rounded-md border border-white/10 text-white/80 hover:border-white/30 disabled:opacity-40"
              >
                <span className="sm:hidden">Todas ({photos.length})</span>
                <span className="hidden sm:inline">Exportar todas ({photos.length})</span>
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={exportActive}
              className="whitespace-nowrap text-[13px] font-medium px-4 py-1.5 rounded-md bg-[#22d3ee] text-black hover:bg-[#e5ff33] disabled:opacity-40 transition-colors"
            >
              {busy ? 'Exportando…' : 'Exportar'}
            </button>
          </>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Panel izquierdo: presets */}
        <aside className="order-3 lg:order-1 lg:w-56 shrink-0 border-t lg:border-t-0 lg:border-r border-white/[0.06] lg:overflow-y-auto scrollbar-thin">
          <PresetList
            activePresetId={active?.presetId}
            userPresets={userPresets}
            onApply={applyPreset}
            onSave={savePreset}
            onDelete={(id) => persistPresets(userPresets.filter((p) => p.id !== id))}
            disabled={!active}
          />
        </aside>

        {/* Centro: vista previa */}
        <main className="order-1 lg:order-2 flex-1 flex flex-col min-w-0 min-h-[60vh] lg:min-h-0">
          <div className="flex-1 relative flex items-center justify-center p-4 lg:p-8 min-h-0 checkerboard">
            {active ? (
              <div ref={stageRef} className="absolute inset-4 lg:inset-8 flex items-center justify-center">
                <div className="relative" style={displaySize}>
                  <canvas
                    ref={canvasRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className={`block w-full h-full shadow-2xl shadow-black/60 ${tab === 'crop' ? 'cursor-move touch-none' : ''}`}
                  />
                  {tab === 'crop' && (
                    <div className="pointer-events-none absolute inset-0 border border-white/60">
                      <div className="absolute inset-y-0 left-1/3 border-l border-white/30" />
                      <div className="absolute inset-y-0 left-2/3 border-l border-white/30" />
                      <div className="absolute inset-x-0 top-1/3 border-t border-white/30" />
                      <div className="absolute inset-x-0 top-2/3 border-t border-white/30" />
                    </div>
                  )}
                  {showBefore && (
                    <span className="absolute top-2 left-2 text-[11px] px-2 py-0.5 rounded bg-black/70 text-white/80">Antes</span>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center gap-4 px-10 py-14 rounded-2xl border-2 border-dashed transition-colors ${
                  dragOver ? 'border-[#22d3ee] bg-[#22d3ee]/5' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div className="w-14 h-14 bg-[#22d3ee]/5 rounded-2xl flex items-center justify-center border border-[#22d3ee]/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold">Arrastra tus fotos aquí</p>
                  <p className="text-white/40 text-[13px] mt-1">o haz clic para elegirlas · JPG, PNG, WEBP</p>
                  <p className="text-white/25 text-[12px] mt-3">Las fotos se procesan en tu navegador, no se suben a ningún servidor.</p>
                </div>
              </button>
            )}
            {dragOver && active && (
              <div className="absolute inset-4 rounded-xl border-2 border-dashed border-[#22d3ee] bg-[#22d3ee]/5 flex items-center justify-center pointer-events-none">
                <p className="text-[#22d3ee] font-medium">Suelta para añadir fotos</p>
              </div>
            )}
          </div>

          {active && (
            <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-2 border-t border-white/[0.06] text-[12px]">
              <button
                type="button"
                onPointerDown={() => setShowBefore(true)}
                onPointerUp={() => setShowBefore(false)}
                onPointerLeave={() => setShowBefore(false)}
                className="px-3 py-1 rounded-md bg-white/5 text-white/70 hover:text-white select-none"
                title="Mantén pulsado (o pulsa \ )"
              >
                Antes / Después
              </button>
              <button type="button" onClick={() => travel('undo')} disabled={!history?.past.length} className="px-3 py-1 rounded-md bg-white/5 text-white/70 hover:text-white disabled:opacity-30">
                ↶ Deshacer
              </button>
              <button type="button" onClick={() => travel('redo')} disabled={!history?.future.length} className="px-3 py-1 rounded-md bg-white/5 text-white/70 hover:text-white disabled:opacity-30">
                ↷ Rehacer
              </button>
              <span className="w-px h-4 bg-white/10 mx-1" />
              <button type="button" onClick={copySettings} className="px-3 py-1 rounded-md bg-white/5 text-white/70 hover:text-white">
                Copiar ajustes
              </button>
              <button type="button" onClick={pasteSettings} disabled={!clipboard} className="px-3 py-1 rounded-md bg-white/5 text-white/70 hover:text-white disabled:opacity-30">
                Pegar
              </button>
              {photos.length > 1 && (
                <button type="button" onClick={syncAll} className="px-3 py-1 rounded-md bg-white/5 text-[#22d3ee] hover:bg-[#22d3ee]/10">
                  Aplicar a todas
                </button>
              )}
              <span className="text-white/25 ml-2 hidden xl:inline">
                {getRatio(active.crop.ratio).label} · {active.name}
              </span>
            </div>
          )}

          <Filmstrip
            photos={photos.map((p) => ({ ...p, edited: isEdited(p) }))}
            activeId={activeId}
            onSelect={setActiveId}
            onRemove={removePhoto}
          />
        </main>

        {/* Panel derecho: ajustes */}
        <aside className="order-2 lg:order-3 lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] lg:overflow-y-auto scrollbar-thin">
          {active ? (
            <>
              <Histogram histogram={histogram} />
              <div className="flex border-b border-white/[0.06]">
                {[
                  { id: 'edit', label: 'Editar' },
                  { id: 'crop', label: 'Recortar (R)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex-1 py-2.5 text-[12px] font-medium border-b-2 -mb-px ${
                      tab === t.id ? 'border-[#22d3ee] text-white' : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'crop' ? (
                <CropPanel crop={active.crop} onChange={(crop) => update(() => ({ crop }))} />
              ) : (
                <>
                  {SECTIONS.map((section) => (
                    <Section
                      key={section.id}
                      title={section.label}
                      dirty={sectionDirty(section)}
                      onReset={() => resetSection(section)}
                    >
                      {section.controls.map((c) => (
                        <Slider
                          key={c.key}
                          label={c.label}
                          value={active.params[c.key]}
                          min={c.min}
                          max={c.max}
                          step={c.step}
                          format={c.format}
                          track={c.track}
                          onChange={(v) => setParam(c.key, v)}
                        />
                      ))}
                    </Section>
                  ))}
                  <Section
                    title="Mezcla de color (HSL)"
                    defaultOpen={false}
                    dirty={!isHslNeutral(active.params.hsl)}
                    onReset={() => setParam('hsl', defaultHsl())}
                  >
                    <HslPanel hsl={active.params.hsl} onChange={(hsl) => setParam('hsl', hsl)} />
                  </Section>
                  <div className="p-4">
                    <button
                      type="button"
                      onClick={resetAll}
                      className="w-full text-[12px] py-2 rounded-md border border-white/10 text-white/50 hover:text-white hover:border-white/30"
                    >
                      Restablecer todos los ajustes
                    </button>
                    <p className="text-[11px] text-white/25 mt-3 leading-relaxed">
                      Atajos: <b>\</b> antes/después · <b>R</b> recortar · <b>Ctrl+Z</b> deshacer · <b>Ctrl+Shift+C/V</b> copiar/pegar
                      ajustes · <b>← →</b> cambiar de foto · doble clic en un ajuste lo restablece.
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="p-6 text-[13px] text-white/30">Importa una foto para empezar a editar.</p>
          )}
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-[#0a0a0a] border border-white/10 text-[13px] text-white/90 shadow-2xl animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>
  );
}

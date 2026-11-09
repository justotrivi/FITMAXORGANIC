"""Quita respiraciones de una frase generada.

El modelo suele inspirar al inicio de cada frase y a veces en medio. Sin limpiar, el procesado de
locutor (compresión + volumen) las sube hasta oírse fuerte. Esto, por cada frase:
  - recorta lo que hay antes de la primera palabra y después de la última (inspiraciones, aire);
  - baja 20 dB las respiraciones de en medio (tramos ruidosos, con aire y sin tono de voz).

Usa numpy si está instalado; si no, hace un recorte básico con ffmpeg.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

VENTANA = 0.02       # 20 ms
MARGEN_INICIO = 0.04  # aire que se deja antes de la primera palabra
MARGEN_FINAL = 0.12   # cola natural después de la última palabra
ATENUACION = 0.1      # -20 dB para respiraciones de en medio
RAMPA = 0.015         # fundidos suaves para que no se noten los cortes


def _leer(ruta: Path, sr: int):
    import numpy as np
    crudo = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ruta), "-ac", "1", "-ar", str(sr),
                            "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(crudo, dtype=np.float32).copy()


def _escribir(muestras, sr: int, ruta: Path) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-",
                    "-c:a", "pcm_s16le", str(ruta)], input=muestras.astype("float32").tobytes(), check=True)


def _clasificar(x, sr: int):
    """Por ventana: (db, es_voz, es_respiracion)."""
    import numpy as np
    n = int(sr * VENTANA)
    total = len(x) // n
    if total == 0:
        return [], n
    marcos = x[: total * n].reshape(total, n) * np.hanning(n)
    rms = np.sqrt(np.mean(marcos ** 2, axis=1)) + 1e-9
    db = 20 * np.log10(rms)
    espectro = np.abs(np.fft.rfft(marcos, axis=1)) + 1e-9
    planitud = np.exp(np.mean(np.log(espectro), axis=1)) / np.mean(espectro, axis=1)
    frecs = np.fft.rfftfreq(n, 1 / sr)
    agudos = espectro[:, frecs > 2000].sum(axis=1) / espectro.sum(axis=1)
    nivel_voz = np.percentile(db, 90)
    es_voz = (db > nivel_voz - 18) & (planitud < 0.3)
    es_resp = (~es_voz) & (db > nivel_voz - 40) & (db < nivel_voz - 6) & (planitud > 0.3) & (agudos > 0.3)
    return list(zip(db, es_voz, es_resp)), n


def limpiar(entrada: Path, salida: Path) -> dict:
    """Escribe en `salida` la frase sin respiraciones. Devuelve un pequeño informe."""
    try:
        import numpy as np
    except ImportError:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(entrada), "-af",
                        "silenceremove=start_periods=1:start_threshold=-32dB:start_silence=0.04,"
                        "areverse,silenceremove=start_periods=1:start_threshold=-32dB:start_silence=0.12,areverse",
                        str(salida)], check=True)
        return {"metodo": "ffmpeg"}

    sr = 24000
    x = _leer(entrada, sr)
    marcos, n = _clasificar(x, sr)
    voz = [i for i, (_, v, _) in enumerate(marcos) if v]
    if not voz:
        _escribir(x, sr, salida)
        return {"metodo": "numpy", "aviso": "no se detectó voz"}

    inicio = max(0, int((voz[0] * VENTANA - MARGEN_INICIO) * sr))
    fin = min(len(x), int(((voz[-1] + 1) * VENTANA + MARGEN_FINAL) * sr))

    # Respiraciones en medio: tramos de >= 80 ms, suaves y AISLADOS de la voz (sin voz 60 ms antes ni
    # después). Las consonantes s, f, z, ch también suenan a aire pero van pegadas a la voz: no se tocan.
    nivel_voz = max(db for db, _, _ in marcos)
    aislamiento = 3  # ventanas (60 ms)
    ganancia = np.ones(len(x), dtype=np.float32)
    medias, i = 0, voz[0]
    while i <= voz[-1]:
        if marcos[i][2]:
            j = i
            while j <= voz[-1] and marcos[j][2]:
                j += 1
            aislada = not any(v for _, v, _ in marcos[max(0, i - aislamiento):i]) and \
                not any(v for _, v, _ in marcos[j:j + aislamiento])
            suave = max(db for db, _, _ in marcos[i:j]) < nivel_voz - 24
            if (j - i) * VENTANA >= 0.08 and aislada and suave:
                a, b = i * n, j * n
                r = int(RAMPA * sr)
                ganancia[a:b] = ATENUACION
                ganancia[max(0, a - r):a] = np.linspace(1, ATENUACION, a - max(0, a - r))
                ganancia[b:b + r] = np.linspace(ATENUACION, 1, len(ganancia[b:b + r]))
                medias += 1
            i = j
        else:
            i += 1

    y = (x * ganancia)[inicio:fin].copy()
    r = int(0.005 * sr)  # 5 ms de fundido en los bordes para evitar clics
    if len(y) > 2 * r:
        y[:r] *= np.linspace(0, 1, r)
        y[-r:] *= np.linspace(1, 0, r)
    _escribir(y, sr, salida)
    return {"metodo": "numpy", "recorte_inicio": round(inicio / sr, 2),
            "recorte_final": round((len(x) - fin) / sr, 2), "respiraciones_medias": medias}

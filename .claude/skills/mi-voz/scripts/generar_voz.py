#!/usr/bin/env python3
"""Genera una locución con la voz clonada del usuario.

Motores:
  voicestudio (por defecto)  App Voice Studio abierta en tu computadora (API local, puerto 3900).
                             Usa el perfil de voz que clonaste en la app (--voz "Mi voz").
  chatterbox                 Respaldo sin app: Chatterbox (MIT) con una grabación de referencia.

Uso:
  python generar_voz.py --guion guion.txt --voz "Mi voz" --salida voz.wav
  python generar_voz.py --listar-voces
  python generar_voz.py --motor chatterbox --guion guion.txt --referencia voz/referencia.wav --salida voz.wav
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

VOICESTUDIO_URL = os.environ.get("VOICESTUDIO_URL", "http://localhost:3900").rstrip("/")
MAX_VOICESTUDIO = 1000  # la API acepta hasta 4096; fragmentos medianos suenan más estables
MAX_CHATTERBOX = 250


def dividir_texto(texto: str, maximo: int) -> list[str]:
    """Divide el guion en fragmentos, respetando frases y comas."""
    texto = re.sub(r"\s+", " ", texto).strip()
    if not texto:
        return []
    frases = re.split(r"(?<=[.!?…])\s+", texto)
    fragmentos: list[str] = []
    actual = ""
    for frase in frases:
        partes = re.split(r"(?<=[,;:])\s+", frase) if len(frase) > maximo else [frase]
        for parte in partes:
            while len(parte) > maximo:
                corte = parte.rfind(" ", 0, maximo)
                corte = corte if corte > 0 else maximo
                if actual:
                    fragmentos.append(actual)
                    actual = ""
                fragmentos.append(parte[:corte].strip())
                parte = parte[corte:].strip()
            if not parte:
                continue
            if actual and len(actual) + 1 + len(parte) > maximo:
                fragmentos.append(actual)
                actual = parte
            else:
                actual = f"{actual} {parte}".strip()
    if actual:
        fragmentos.append(actual)
    return fragmentos


# ── Voice Studio ─────────────────────────────────────────────────────────────

def _vs_pedir(ruta: str, datos: dict | None = None, timeout: float = 30) -> bytes:
    cuerpo = json.dumps(datos).encode() if datos is not None else None
    req = urllib.request.Request(
        VOICESTUDIO_URL + ruta,
        data=cuerpo,
        headers={"Content-Type": "application/json"} if cuerpo else {},
        method="POST" if cuerpo else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        detalle = e.read().decode(errors="replace")
        try:
            detalle = json.loads(detalle)["error"]["message"]
        except Exception:
            pass
        raise RuntimeError(f"Voice Studio respondió {e.code}: {detalle}") from None
    except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
        raise RuntimeError(
            f"No pude conectar con Voice Studio en {VOICESTUDIO_URL} ({e}).\n"
            "Abre la app Voice Studio en tu computadora y vuelve a intentar."
        ) from None


def vs_perfiles() -> list[dict]:
    voces = json.loads(_vs_pedir("/v1/audio/voices"))
    voces = voces.get("voices", voces) if isinstance(voces, dict) else voces
    return [v for v in voces if v.get("type") == "profile"]


def generar_voicestudio(fragmentos, args, carpeta: Path) -> list[Path]:
    _vs_pedir("/health", timeout=10)
    perfiles = vs_perfiles()
    if not perfiles:
        raise RuntimeError(
            "No tienes perfiles de voz en Voice Studio. En la app ve a Voice cloning, "
            "sube tu grabación y guárdala como perfil (por ejemplo, \"Mi voz\")."
        )
    buscado = args.voz.strip().lower()
    elegido = next((p for p in perfiles if p["voice_id"] == args.voz), None) or next(
        (p for p in perfiles if p["name"].strip().lower() == buscado), None
    )
    if not elegido:
        nombres = ", ".join(f'"{p["name"]}"' for p in perfiles)
        raise RuntimeError(f'No encontré el perfil "{args.voz}". Perfiles disponibles: {nombres}')

    archivos = []
    for i, fragmento in enumerate(fragmentos, 1):
        print(f"[{i}/{len(fragmentos)}] {fragmento}")
        peticion = {
            "model": "tts-1",  # alias: el motor que tengas activo en Voice Studio
            "input": fragmento,
            "voice": elegido["voice_id"],
            "response_format": "wav",
            "language": args.idioma,
            "speed": args.velocidad,
        }
        if args.estilo:
            peticion["instructions"] = args.estilo
        audio = _vs_pedir("/v1/audio/speech", peticion, timeout=1800)
        if not audio.startswith(b"RIFF"):
            raise RuntimeError("Voice Studio no devolvió un audio válido: " + audio[:200].decode(errors="replace"))
        destino = carpeta / f"{i:03d}.wav"
        destino.write_bytes(audio)
        archivos.append(destino)
    return archivos


# ── Chatterbox (respaldo) ────────────────────────────────────────────────────

def generar_chatterbox(fragmentos, args, carpeta: Path) -> list[Path]:
    if not args.referencia or not args.referencia.is_file():
        raise RuntimeError("Con --motor chatterbox necesitas --referencia con tu grabación (.wav).")
    try:
        import torch
        import torchaudio
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    except ImportError:
        raise RuntimeError(
            "Falta Chatterbox. Instálalo con: pip install -r .claude/skills/mi-voz/requirements.txt"
        ) from None

    if torch.cuda.is_available():
        dispositivo = "cuda"
    elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        dispositivo = "mps"
    else:
        dispositivo = "cpu"
    print(f"Cargando Chatterbox en {dispositivo} (la primera vez se descarga)...")
    modelo = ChatterboxMultilingualTTS.from_pretrained(device=dispositivo)

    archivos = []
    for i, fragmento in enumerate(fragmentos, 1):
        print(f"[{i}/{len(fragmentos)}] {fragmento}")
        wav = modelo.generate(
            fragmento,
            language_id=args.idioma,
            audio_prompt_path=str(args.referencia),
            exaggeration=args.expresividad,
            cfg_weight=0.5,
        )
        destino = carpeta / f"{i:03d}.wav"
        torchaudio.save(str(destino), wav.cpu(), modelo.sr)
        archivos.append(destino)
    return archivos


# ── Unir fragmentos ──────────────────────────────────────────────────────────

def unir(archivos: list[Path], salida: Path, pausa: float) -> float:
    """Une los fragmentos con una pausa entre cada uno usando ffmpeg."""
    if not shutil.which("ffmpeg"):
        raise RuntimeError("Falta ffmpeg. Instálalo (Mac: brew install ffmpeg · Windows: winget install ffmpeg).")
    entradas, filtros, etiquetas = [], [], []
    for i, f in enumerate(archivos):
        entradas += ["-i", str(f)]
        filtros.append(f"[{i}:a]aresample=24000,aformat=channel_layouts=mono[a{i}]")
        etiquetas.append(f"[a{i}]")
        if i < len(archivos) - 1 and pausa > 0:
            filtros.append(f"aevalsrc=0:d={pausa}:s=24000[s{i}]")
            etiquetas.append(f"[s{i}]")
    filtro = ";".join(filtros) + ";" + "".join(etiquetas) + f"concat=n={len(etiquetas)}:v=0:a=1[out]"
    salida.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *entradas,
         "-filter_complex", filtro, "-map", "[out]", str(salida)],
        check=True,
    )
    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(salida)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(dur)


def main() -> int:
    p = argparse.ArgumentParser(description="Locución con tu voz clonada")
    p.add_argument("--guion", type=Path, help="Archivo .txt con el guion")
    p.add_argument("--texto", help="Texto directo (en vez de --guion)")
    p.add_argument("--salida", type=Path, help="Archivo .wav de salida")
    p.add_argument("--motor", choices=["voicestudio", "chatterbox"], default="voicestudio")
    p.add_argument("--voz", default=os.environ.get("MI_VOZ_PERFIL", "Mi voz"),
                   help='Voice Studio: nombre o ID del perfil (por defecto "Mi voz")')
    p.add_argument("--referencia", type=Path, help="Chatterbox: grabación de tu voz (.wav)")
    p.add_argument("--idioma", default="es", help="Código de idioma (por defecto: es)")
    p.add_argument("--velocidad", type=float, default=1.0, help="Voice Studio: 0.25 a 4.0 (por defecto 1.0)")
    p.add_argument("--estilo", help='Voice Studio: indicación de tono, p. ej. "enérgico y alegre"')
    p.add_argument("--expresividad", type=float, default=0.5, help="Chatterbox: 0.25 a 1.0")
    p.add_argument("--pausa", type=float, default=0.25, help="Segundos de silencio entre fragmentos")
    p.add_argument("--listar-voces", action="store_true", help="Muestra tus perfiles de Voice Studio")
    p.add_argument("--prueba", action="store_true", help="Solo muestra cómo se divide el guion")
    args = p.parse_args()

    try:
        if args.listar_voces:
            for v in vs_perfiles():
                print(f'- "{v["name"]}" (idioma: {v.get("language") or "?"}, ID: {v["voice_id"]})')
            return 0

        if bool(args.guion) == bool(args.texto):
            p.error("usa --guion o --texto (uno de los dos)")
        texto = args.guion.read_text(encoding="utf-8") if args.guion else args.texto
        maximo = MAX_VOICESTUDIO if args.motor == "voicestudio" else MAX_CHATTERBOX
        fragmentos = dividir_texto(texto, maximo)
        if not fragmentos:
            raise RuntimeError("El guion está vacío.")

        if args.prueba:
            for i, f in enumerate(fragmentos, 1):
                print(f"[{i}] ({len(f)} caracteres) {f}")
            return 0
        if not args.salida:
            p.error("falta --salida")

        with tempfile.TemporaryDirectory() as tmp:
            generar = generar_voicestudio if args.motor == "voicestudio" else generar_chatterbox
            archivos = generar(fragmentos, args, Path(tmp))
            duracion = unir(archivos, args.salida, args.pausa)
        print(f"Listo: {args.salida} ({duracion:.1f} s)")
        return 0
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

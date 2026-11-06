#!/usr/bin/env python3
"""Genera una locución con la voz clonada del usuario.

Motores:
  voicestudio (por defecto)  App Voice Studio abierta en tu computadora (API local, puerto 3900).
                             Usa el perfil de voz creado con crear_perfil.py (--voz "Mi voz").
                             Verifica cada frase transcribiéndola y la regenera si no se entiende.
  chatterbox                 Respaldo sin app: Chatterbox (MIT) con una grabación de referencia.

Uso:
  python generar_voz.py --guion guion.txt --salida voz.wav
  python generar_voz.py --texto "Hola" --salida voz.wav
  python generar_voz.py --listar-voces
"""
from __future__ import annotations  # compatible con Python 3.9 (el de macOS)

import argparse
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vs  # noqa: E402

MAX_VOICESTUDIO = 300  # frases cortas: el modelo pronuncia mejor y es más fácil reintentar
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


def duracion(ruta: Path) -> float:
    salida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ruta)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(salida)


# ── Voice Studio con verificación ────────────────────────────────────────────

def generar_frases(textos: list[str], carpeta: Path, voz: str, idioma: str = "es", velocidad: float = 1.0,
                   estilo: str | None = None, pasos: int = 32, verificar: bool = True,
                   umbral: float = 0.85, intentos: int = 3, reusar: bool = False) -> list[dict]:
    """Genera cada frase en carpeta/NN.wav. Si verificar, la transcribe y reintenta las que no se entienden.

    Devuelve una lista de dicts: {archivo, texto, transcripcion, similitud, intentos}.
    Con reusar=True conserva las frases ya generadas antes con el mismo texto (guarda frases.json).
    """
    vs.comprobar()
    perfil = vs.buscar_perfil(voz)
    if not perfil:
        nombres = ", ".join(f'"{p["name"]}"' for p in vs.perfiles()) or "ninguno"
        raise vs.VSError(
            f'No encontré el perfil de voz "{voz}" en Voice Studio (perfiles: {nombres}). '
            "Créalo con crear_perfil.py."
        )
    carpeta.mkdir(parents=True, exist_ok=True)
    registro_ruta = carpeta / "frases.json"
    anterior = {}
    if reusar and registro_ruta.exists():
        anterior = {r["archivo"]: r for r in json.loads(registro_ruta.read_text(encoding="utf-8"))}

    resultados = []
    for i, texto in enumerate(textos, 1):
        texto = vs.preparar_texto(texto)
        archivo = carpeta / f"{i:02d}.wav"
        previo = anterior.get(archivo.name)
        if previo and previo["texto"] == texto and archivo.exists():
            print(f"[{i}/{len(textos)}] (ya estaba) {texto}")
            resultados.append(dict(previo, archivo=archivo.name))
            continue
        print(f"[{i}/{len(textos)}] {texto}")
        archivo.write_bytes(vs.sintetizar(texto, perfil["voice_id"], idioma, velocidad, estilo, pasos,
                                          random.randint(1, 2**31 - 1)))
        resultados.append({"archivo": archivo.name, "texto": texto, "transcripcion": None,
                           "similitud": None, "intentos": 1})

    if verificar:
        # Primero se generan todas y luego se transcriben: así no se cargan los dos modelos a la vez
        pendientes = [r for r in resultados if r["similitud"] is None or r["similitud"] < umbral]
        ronda = 1
        while pendientes:
            print(f"Verificando {len(pendientes)} frase(s) (ronda {ronda})...")
            for r in pendientes:
                oido = vs.transcribir(Path(r.get("_candidato") or carpeta / r["archivo"]), idioma)
                sim = vs.similitud(r["texto"], oido)
                mejor = r.get("similitud")
                if mejor is None or sim > mejor:
                    r.update(transcripcion=oido, similitud=round(sim, 2))
                    if r.get("_candidato"):
                        Path(r.pop("_candidato")).replace(carpeta / r["archivo"])
                elif r.get("_candidato"):
                    Path(r.pop("_candidato")).unlink(missing_ok=True)
                estado = "OK" if r["similitud"] >= umbral else "se entiende mal"
                print(f"  {r['archivo']}: {int(r['similitud'] * 100)}% {estado} -> \"{r['transcripcion']}\"")
            pendientes = [r for r in pendientes if r["similitud"] < umbral and r["intentos"] < intentos]
            if not pendientes:
                break
            print(f"Regenerando {len(pendientes)} frase(s) con otra variación...")
            for r in pendientes:
                candidato = carpeta / f"_candidato_{r['archivo']}"
                candidato.write_bytes(vs.sintetizar(r["texto"], perfil["voice_id"], idioma, velocidad, estilo,
                                                    pasos, random.randint(1, 2**31 - 1)))
                r["_candidato"] = str(candidato)
                r["intentos"] += 1
            ronda += 1

    registro_ruta.write_text(json.dumps(resultados, ensure_ascii=False, indent=1), encoding="utf-8")
    malas = [r for r in resultados if r["similitud"] is not None and r["similitud"] < umbral]
    if malas:
        print("Aviso: estas frases siguen sin entenderse bien. Reescríbelas (más simples, números en letras, "
              "marcas como se pronuncian) o regrábalas:")
        for r in malas:
            print(f"  {r['archivo']}: \"{r['texto']}\" se oye como \"{r['transcripcion']}\"")
    return resultados


# ── Chatterbox (respaldo) ────────────────────────────────────────────────────

def generar_chatterbox(fragmentos, args, carpeta: Path) -> list[Path]:
    if not args.referencia or not args.referencia.is_file():
        raise vs.VSError("Con --motor chatterbox necesitas --referencia con tu grabación (.wav).")
    try:
        import torch
        import torchaudio
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    except ImportError:
        raise vs.VSError(
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
        wav = modelo.generate(fragmento, language_id=args.idioma, audio_prompt_path=str(args.referencia),
                              exaggeration=args.expresividad, cfg_weight=0.5)
        destino = carpeta / f"{i:02d}.wav"
        torchaudio.save(str(destino), wav.cpu(), modelo.sr)
        archivos.append(destino)
    return archivos


# ── Unir fragmentos ──────────────────────────────────────────────────────────

def unir(archivos: list[Path], salida: Path, pausa: float) -> float:
    """Une los fragmentos con una pausa entre cada uno usando ffmpeg."""
    if not shutil.which("ffmpeg"):
        raise vs.VSError("Falta ffmpeg. Instálalo (Mac: brew install ffmpeg · Windows: winget install ffmpeg).")
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
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *entradas,
                    "-filter_complex", filtro, "-map", "[out]", str(salida)], check=True)
    return duracion(salida)


# Procesado "voz de locutor": quita graves que embarran, da presencia (claridad), comprime para que
# todo se oiga parejo y fuerte, y deja el volumen en el estándar de Instagram/TikTok (-14 LUFS).
CADENA_ENERGIA = (
    "highpass=f=80,"
    "equalizer=f=250:t=q:w=1:g=-2,"
    "equalizer=f=3500:t=q:w=1.2:g=3,"
    "equalizer=f=8000:t=q:w=1:g=1.5,"
    "acompressor=threshold=0.1:ratio=3:attack=5:release=80:makeup=2,"
    "loudnorm=I=-14:TP=-1:LRA=7"
)


def masterizar(ruta: Path) -> None:
    """Aplica CADENA_ENERGIA al archivo, en el mismo lugar."""
    temporal = ruta.with_name(ruta.stem + "_master.wav")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(ruta),
                    "-af", CADENA_ENERGIA, "-ar", "48000", str(temporal)], check=True)
    temporal.replace(ruta)


def agregar_opciones_voz(p: argparse.ArgumentParser) -> None:
    p.add_argument("--voz", default=os.environ.get("MI_VOZ_PERFIL", "Mi voz"),
                   help='Nombre o ID del perfil en Voice Studio (por defecto "Mi voz")')
    p.add_argument("--idioma", default="es", help="Código de idioma (por defecto: es)")
    p.add_argument("--velocidad", type=float, default=1.0, help="0.25 a 4.0 (por defecto 1.0)")
    p.add_argument("--estilo", help='Indicación de tono, p. ej. "enérgico y alegre"')
    p.add_argument("--pasos", type=int, default=32, help="Refinamiento 8-64 (por defecto 32; más = más lento)")
    p.add_argument("--sin-verificar", action="store_true", help="No transcribir para comprobar cada frase")
    p.add_argument("--umbral", type=float, default=0.85, help="Parecido mínimo aceptado (0-1, por defecto 0.85)")
    p.add_argument("--intentos", type=int, default=3, help="Intentos máximos por frase (por defecto 3)")
    p.add_argument("--voz-natural", action="store_true",
                   help="Sin procesado de locutor (por defecto se comprime, se da presencia y se sube a -14 LUFS)")


def main() -> int:
    p = argparse.ArgumentParser(description="Locución con tu voz clonada")
    p.add_argument("--guion", type=Path, help="Archivo .txt con el guion")
    p.add_argument("--texto", help="Texto directo (en vez de --guion)")
    p.add_argument("--salida", type=Path, help="Archivo .wav de salida")
    p.add_argument("--motor", choices=["voicestudio", "chatterbox"], default="voicestudio")
    agregar_opciones_voz(p)
    p.add_argument("--referencia", type=Path, help="Chatterbox: grabación de tu voz (.wav)")
    p.add_argument("--expresividad", type=float, default=0.5, help="Chatterbox: 0.25 a 1.0")
    p.add_argument("--pausa", type=float, default=0.25, help="Segundos de silencio entre frases")
    p.add_argument("--listar-voces", action="store_true", help="Muestra tus perfiles de Voice Studio")
    p.add_argument("--prueba", action="store_true", help="Solo muestra cómo se divide el guion")
    args = p.parse_args()

    try:
        if args.listar_voces:
            for v in vs.perfiles():
                print(f'- "{v["name"]}" (idioma: {v.get("language") or "?"}, ID: {v["voice_id"]})')
            return 0

        if bool(args.guion) == bool(args.texto):
            p.error("usa --guion o --texto (uno de los dos)")
        texto = args.guion.read_text(encoding="utf-8") if args.guion else args.texto
        maximo = MAX_VOICESTUDIO if args.motor == "voicestudio" else MAX_CHATTERBOX
        fragmentos = dividir_texto(texto, maximo)
        if not fragmentos:
            raise vs.VSError("El guion está vacío.")

        if args.prueba:
            for i, f in enumerate(fragmentos, 1):
                print(f"[{i}] ({len(f)} caracteres) {vs.preparar_texto(f)}")
            return 0
        if not args.salida:
            p.error("falta --salida")

        with tempfile.TemporaryDirectory() as tmp:
            carpeta = Path(tmp)
            if args.motor == "voicestudio":
                resultados = generar_frases(fragmentos, carpeta, args.voz, args.idioma, args.velocidad,
                                            args.estilo, args.pasos, not args.sin_verificar,
                                            args.umbral, args.intentos)
                archivos = [carpeta / r["archivo"] for r in resultados]
            else:
                archivos = generar_chatterbox(fragmentos, args, carpeta)
            total = unir(archivos, args.salida, args.pausa)
        if not args.voz_natural:
            masterizar(args.salida)
        print(f"Listo: {args.salida} ({total:.1f} s)")
        return 0
    except (vs.VSError, subprocess.CalledProcessError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

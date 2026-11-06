"""Cliente mínimo de la API local de Voice Studio (solo biblioteca estándar, Python 3.9+)."""
from __future__ import annotations

import difflib
import json
import os
import re
import shutil
import unicodedata
import urllib.error
import urllib.request
import uuid
from pathlib import Path

URL = os.environ.get("VOICESTUDIO_URL", "http://localhost:3900").rstrip("/")

# ffmpeg instalado en ~/.local/bin (sin Homebrew) no siempre está en el PATH de otros programas
_LOCAL_BIN = Path.home() / ".local" / "bin"
if not shutil.which("ffmpeg") and (_LOCAL_BIN / "ffmpeg").exists():
    os.environ["PATH"] = f"{_LOCAL_BIN}{os.pathsep}{os.environ.get('PATH', '')}"


class VSError(RuntimeError):
    pass


def _multipart(campos: dict) -> tuple[bytes, str]:
    limite = uuid.uuid4().hex
    partes = []
    for nombre, valor in campos.items():
        if valor is None:
            continue
        if isinstance(valor, tuple):  # (nombre_archivo, bytes, tipo)
            archivo, datos, tipo = valor
            cabecera = (
                f'--{limite}\r\nContent-Disposition: form-data; name="{nombre}"; '
                f'filename="{archivo}"\r\nContent-Type: {tipo}\r\n\r\n'
            )
            partes.append(cabecera.encode() + datos + b"\r\n")
        else:
            cabecera = f'--{limite}\r\nContent-Disposition: form-data; name="{nombre}"\r\n\r\n'
            partes.append(cabecera.encode() + str(valor).encode() + b"\r\n")
    partes.append(f"--{limite}--\r\n".encode())
    return b"".join(partes), f"multipart/form-data; boundary={limite}"


def _mensaje_error(codigo: int, cuerpo: str) -> str:
    detalle = cuerpo
    try:
        j = json.loads(cuerpo)
        detalle = (j.get("error") or {}).get("message") or j.get("detail") or cuerpo
        if isinstance(detalle, dict):
            detalle = detalle.get("message") or json.dumps(detalle, ensure_ascii=False)
    except (ValueError, AttributeError):
        pass
    if "memory" in str(detalle).lower():
        return (
            "Tu computadora no tiene memoria libre suficiente para generar la voz. "
            "Cierra Chrome y otras apps pesadas (deja solo Claude y Voice Studio) y vuelve a intentar.\n"
            f"Detalle de Voice Studio: {detalle}"
        )
    return f"Voice Studio respondió {codigo}: {detalle}"


def pedir(ruta: str, datos=None, metodo: str | None = None, timeout: float = 60, multipart: dict | None = None) -> bytes:
    cabeceras = {}
    cuerpo = None
    if multipart is not None:
        cuerpo, tipo = _multipart(multipart)
        cabeceras["Content-Type"] = tipo
    elif datos is not None:
        cuerpo = json.dumps(datos).encode()
        cabeceras["Content-Type"] = "application/json"
    metodo = metodo or ("POST" if cuerpo is not None else "GET")
    req = urllib.request.Request(URL + ruta, data=cuerpo, headers=cabeceras, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise VSError(_mensaje_error(e.code, e.read().decode(errors="replace"))) from None
    except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
        raise VSError(
            f"No pude conectar con Voice Studio en {URL} ({e}).\n"
            "Abre la app Voice Studio y espera a que termine de cargar."
        ) from None


def pedir_json(*args, **kwargs):
    return json.loads(pedir(*args, **kwargs))


def comprobar() -> None:
    pedir("/health", timeout=10)


def perfiles() -> list[dict]:
    voces = pedir_json("/v1/audio/voices")
    voces = voces.get("voices", voces) if isinstance(voces, dict) else voces
    return [v for v in voces if v.get("type") == "profile"]


def buscar_perfil(nombre_o_id: str) -> dict | None:
    buscado = nombre_o_id.strip().lower()
    lista = perfiles()
    return next((p for p in lista if p["voice_id"] == nombre_o_id), None) or next(
        (p for p in lista if p["name"].strip().lower() == buscado), None
    )


def preparar_texto(texto: str) -> str:
    """Limpia una frase para que el modelo la lea bien."""
    texto = texto.replace("…", "...")
    texto = re.sub(r"\s+", " ", texto).strip()
    texto = re.sub(r"^[\s.,;:…-]+", "", texto)  # sin puntos suspensivos ni comas al inicio
    if texto and texto[0].islower():
        texto = texto[0].upper() + texto[1:]
    if texto and texto[-1] not in ".!?…":
        texto += "."
    return texto


def sintetizar(texto: str, voz_id: str, idioma: str = "es", velocidad: float = 1.0,
               estilo: str | None = None, pasos: int | None = 32, semilla: int | None = None) -> bytes:
    peticion = {
        "model": "tts-1",  # alias: el motor activo en Voice Studio
        "input": texto,
        "voice": voz_id,
        "response_format": "wav",
        "language": idioma,
        "speed": velocidad,
    }
    if estilo:
        peticion["instructions"] = estilo
    if pasos:
        peticion["num_step"] = pasos
    if semilla is not None:
        peticion["seed"] = semilla
    audio = pedir("/v1/audio/speech", peticion, timeout=1800)
    if not audio.startswith(b"RIFF"):
        raise VSError("Voice Studio no devolvió un audio válido: " + audio[:200].decode(errors="replace"))
    return audio


def transcribir(ruta: Path, idioma: str = "es") -> str:
    """Transcribe un audio con el motor de reconocimiento activo en Voice Studio."""
    try:
        texto = pedir(
            "/v1/audio/transcriptions",
            multipart={
                "file": (Path(ruta).name, Path(ruta).read_bytes(), "audio/wav"),
                "model": "whisper-1",
                "language": idioma,
                "response_format": "text",
            },
            timeout=900,
        )
    except VSError as e:
        if "speech-to-text model" in str(e) or "asr_model_missing" in str(e):
            raise VSError(
                "Voice Studio no tiene un modelo de reconocimiento de voz listo. Elige uno instalado "
                "(por ejemplo Whisper large-v3 Turbo) en Model Catalogue, o ejecuta:\n"
                "  curl -X POST http://localhost:3900/engines/select -H 'Content-Type: application/json' "
                "-d '{\"family\":\"asr\",\"backend_id\":\"faster-whisper\","
                "\"model_id\":\"deepdml/faster-whisper-large-v3-turbo-ct2\"}'\n"
                f"Detalle: {e}"
            ) from None
        raise
    return texto.decode().strip()


def _palabras(texto: str) -> list[str]:
    texto = unicodedata.normalize("NFKD", texto.lower())
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.findall(r"[a-z0-9ñ]+", texto)


def similitud(esperado: str, obtenido: str) -> float:
    """0 a 1: qué tanto coincide lo que se oye con lo que debía decir (por palabras)."""
    a, b = _palabras(esperado), _palabras(obtenido)
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()

#!/usr/bin/env python3
"""Crea (o actualiza) el perfil de voz del usuario en Voice Studio a partir de una grabación.

1. Prepara la grabación: limpia y corta unos 10 s en una pausa natural (preparar_referencia.sh).
2. La transcribe con Voice Studio: el texto debe coincidir EXACTO con lo que se oye; si no,
   el modelo mezcla palabras de la grabación en las frases nuevas.
3. Crea el perfil o reemplaza su grabación si ya existe uno con ese nombre.

Uso:
  python crear_perfil.py <grabacion> [--nombre "Mi voz"] [--es-mi-voz]
  python crear_perfil.py <grabacion> --texto-referencia "lo que dice exactamente"
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(DIR))
import vs  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Crea tu perfil de voz en Voice Studio")
    p.add_argument("grabacion", type=Path, help="Grabación de tu voz (wav, m4a, mp3...)")
    p.add_argument("--nombre", default="Mi voz", help='Nombre del perfil (por defecto "Mi voz")')
    p.add_argument("--idioma", default="es")
    p.add_argument("--duracion", type=float, default=10, help="Segundos máximos de referencia (por defecto 10)")
    p.add_argument("--texto-referencia", help="Transcripción exacta (si no, se transcribe automáticamente)")
    p.add_argument("--es-mi-voz", action="store_true",
                   help="Registra en Voice Studio que la voz es del propio usuario (solo si lo confirmó)")
    args = p.parse_args()

    try:
        if not args.grabacion.is_file():
            raise vs.VSError(f"No existe {args.grabacion}")
        vs.comprobar()

        referencia = DIR.parent / "voz" / "referencia.wav"
        subprocess.run(["bash", str(DIR / "preparar_referencia.sh"), str(args.grabacion), str(referencia)],
                       check=True, env={**os.environ, "DURACION": str(args.duracion)})

        texto = args.texto_referencia
        if not texto:
            print("Transcribiendo la referencia para que el texto coincida exacto...")
            texto = vs.transcribir(referencia, args.idioma)
        if not texto.strip():
            raise vs.VSError("No se entendió ninguna palabra en la grabación. Graba de nuevo más cerca del micrófono.")
        print(f'Texto de la referencia: "{texto}"')

        campos = {
            "ref_audio": ("referencia.wav", referencia.read_bytes(), "audio/wav"),
            "ref_text": texto,
            "language": args.idioma,
        }
        existente = vs.buscar_perfil(args.nombre)
        if existente:
            perfil = vs.pedir_json(f"/profiles/{existente['voice_id']}/audio", metodo="PUT",
                                   multipart=campos, timeout=300)
            accion = "actualizado"
        else:
            perfil = vs.pedir_json("/profiles", multipart={**campos, "name": args.nombre, "kind": "clone"},
                                   timeout=300)
            accion = "creado"
        perfil_id = perfil.get("id") or (existente or {}).get("voice_id")
        print(f'Perfil "{args.nombre}" {accion} (ID {perfil_id}).')

        if args.es_mi_voz:
            vs.pedir_json(f"/profiles/{perfil_id}/attestation", {"basis": "own_voice"})
            print("Registrado: la voz es del propio usuario.")
        return 0
    except (vs.VSError, subprocess.CalledProcessError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

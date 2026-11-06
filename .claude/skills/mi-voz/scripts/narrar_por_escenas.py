#!/usr/bin/env python3
"""Narra un video escena por escena: cada frase suena en el segundo en que aparece su texto.

Paso 1 - ver las escenas del video (tiempos + una imagen con el texto de cada escena):
  python narrar_por_escenas.py --detectar VIDEO.mp4 --carpeta salidas/mi_video

Paso 2 - escribir el guion con tiempos (un renglón por frase: segundo<TAB>frase):
  0.3   Ese video viral que reposteaste te está escondiendo.
  5.2   Instagram premia lo original.

Paso 3 - generar, verificar, acomodar y montar:
  python narrar_por_escenas.py --guion salidas/mi_video/guion.txt --video VIDEO.mp4 \
      --salida salidas/mi_video_CON_MI_VOZ.mp4 [--modo reemplazar|mezclar]

Si cambias una frase del guion y lo vuelves a correr, solo se regeneran las frases cambiadas.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(DIR))
import vs  # noqa: E402
from generar_voz import agregar_opciones_voz, duracion, generar_frases, masterizar  # noqa: E402

MAX_ACELERAR = 1.15   # acelerar más de 15 % se nota
SEPARACION = 0.12     # silencio mínimo entre frases


def leer_tiempo(valor: str) -> float:
    partes = valor.strip().split(":")
    segundos = 0.0
    for p in partes:
        segundos = segundos * 60 + float(p)
    return segundos


def leer_guion(ruta: Path) -> list[tuple[float, str]]:
    lineas = []
    for n, linea in enumerate(ruta.read_text(encoding="utf-8").splitlines(), 1):
        linea = linea.strip()
        if not linea or linea.startswith("#"):
            continue
        m = re.match(r"^([\d:.]+)\s+(.+)$", linea)
        if not m:
            raise vs.VSError(f"Renglón {n} del guion sin tiempo: «{linea}». Formato: 12.5<TAB>frase")
        lineas.append((leer_tiempo(m.group(1)), m.group(2).strip()))
    lineas.sort(key=lambda x: x[0])
    if not lineas:
        raise vs.VSError("El guion está vacío.")
    return lineas


def detectar(video: Path, carpeta: Path) -> None:
    """Imprime los cambios de escena y guarda una hoja con el texto visible al final de cada escena."""
    total = duracion(video)
    salida = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(video), "-vf", "select='gt(scene,0.08)',showinfo", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    cortes = [0.0]
    for t in (float(x) for x in re.findall(r"pts_time:([\d.]+)", salida)):
        if t - cortes[-1] > 0.6:
            cortes.append(t)
    carpeta.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for i, inicio in enumerate(cortes):
            fin = cortes[i + 1] if i + 1 < len(cortes) else total
            momento = max(inicio, fin - 0.4)  # al final de la escena el texto ya está completo
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{momento:.2f}",
                            "-i", str(video), "-frames:v", "1", "-vf", "crop=iw:ih*0.4:0:0,scale=540:-1",
                            f"{tmp}/e_{i:03d}.png"], check=True)
        filas = (len(cortes) + 1) // 2
        hoja = carpeta / "escenas.jpg"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", f"{tmp}/e_%03d.png",
                        "-vf", f"tile=2x{filas}:padding=8:color=white", "-frames:v", "1", str(hoja)], check=True)
    print(f"Video: {total:.1f} s, {len(cortes)} escenas")
    for i, inicio in enumerate(cortes, 1):
        fin = cortes[i] if i < len(cortes) else total
        print(f"  escena {i}: {inicio:5.1f} s -> {fin:5.1f} s ({fin - inicio:.1f} s)")
    print(f"Imagen con el texto de cada escena (de izquierda a derecha, por filas): {hoja}")
    print("Ojo: en escenas donde el texto cambia sin corte (animación) puede haber más de una frase; revísalo.")


def acomodar(lineas, resultados, carpeta: Path, fin_video: float) -> tuple[list[dict], list[str]]:
    plan, avisos = [], []
    fin_anterior = 0.0
    for i, ((inicio, _), r) in enumerate(zip(lineas, resultados)):
        dur = duracion(carpeta / r["archivo"])
        empieza = max(inicio, fin_anterior + SEPARACION)
        limite = lineas[i + 1][0] - SEPARACION if i + 1 < len(lineas) else fin_video + 1.5
        disponible = limite - empieza
        tempo = 1.0
        if dur > disponible > 0:
            tempo = min(dur / disponible, MAX_ACELERAR)
        dur_final = dur / tempo
        if dur_final > disponible + 0.05:
            avisos.append(f"La frase {i + 1} («{r['texto']}») dura {dur_final:.1f} s y su escena da {max(disponible, 0):.1f} s: "
                          f"se corre {dur_final - disponible:.1f} s. Acórtala.")
        plan.append({"archivo": r["archivo"], "inicio": empieza, "tempo": tempo, "duracion": dur_final,
                     "texto": r["texto"], "similitud": r.get("similitud")})
        fin_anterior = empieza + dur_final
    return plan, avisos


def mezclar(plan, carpeta: Path, salida: Path) -> None:
    entradas, filtros = [], []
    for i, p in enumerate(plan):
        entradas += ["-i", str(carpeta / p["archivo"])]
        cadena = f"[{i}:a]aresample=24000"
        if p["tempo"] > 1.001:
            cadena += f",atempo={p['tempo']:.3f}"
        filtros.append(f"{cadena},adelay={int(p['inicio'] * 1000)}:all=1[a{i}]")
    etiquetas = "".join(f"[a{i}]" for i in range(len(plan)))
    filtros.append(f"{etiquetas}amix=inputs={len(plan)}:duration=longest:normalize=0[out]")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *entradas,
                    "-filter_complex", ";".join(filtros), "-map", "[out]", str(salida)], check=True)


def main() -> int:
    p = argparse.ArgumentParser(description="Narra un video escena por escena con tu voz")
    p.add_argument("--detectar", type=Path, metavar="VIDEO", help="Solo detectar escenas de este video")
    p.add_argument("--guion", type=Path, help="Guion con tiempos: segundo<TAB>frase por renglón")
    p.add_argument("--video", type=Path, help="Video a narrar")
    p.add_argument("--salida", type=Path, help="Video final .mp4 (si no, solo se crea la narración .wav)")
    p.add_argument("--carpeta", type=Path, help="Carpeta de trabajo (por defecto, la del guion)")
    p.add_argument("--modo", choices=["reemplazar", "mezclar"], default="reemplazar",
                   help="reemplazar (por defecto) quita el audio original; mezclar lo deja bajito")
    agregar_opciones_voz(p)
    p.set_defaults(velocidad=1.1)  # en reels, un ritmo un poco más ágil suena con más energía
    args = p.parse_args()

    try:
        if args.detectar:
            detectar(args.detectar, args.carpeta or Path("salidas") / args.detectar.stem)
            return 0
        if not args.guion:
            p.error("falta --guion (o usa --detectar VIDEO)")
        carpeta = args.carpeta or args.guion.parent
        lineas = leer_guion(args.guion)
        fin_video = duracion(args.video) if args.video else lineas[-1][0] + 10

        resultados = generar_frases([t for _, t in lineas], carpeta / "frases", args.voz, args.idioma,
                                    args.velocidad, args.estilo, args.pasos, not args.sin_verificar,
                                    args.umbral, args.intentos, reusar=True)
        plan, avisos = acomodar(lineas, resultados, carpeta / "frases", fin_video)
        narracion = carpeta / "narracion.wav"
        mezclar(plan, carpeta / "frases", narracion)
        if not args.voz_natural:
            masterizar(narracion)

        print("\nLínea de tiempo:")
        for i, x in enumerate(plan, 1):
            extra = f" (acelerada {int((x['tempo'] - 1) * 100)} %)" if x["tempo"] > 1.001 else ""
            sim = f" · se entiende {int(x['similitud'] * 100)} %" if x["similitud"] is not None else ""
            print(f"  {i:2d}. {x['inicio']:5.1f} s -> {x['inicio'] + x['duracion']:5.1f} s{extra}{sim}  {x['texto']}")
        for a in avisos:
            print("Aviso: " + a)
        print(f"Narración: {narracion} ({duracion(narracion):.1f} s)")

        if args.video and args.salida:
            subprocess.run(["bash", str(DIR / "montar_video.sh"), str(args.video), str(narracion),
                            str(args.salida), args.modo], check=True)
        return 0
    except (vs.VSError, subprocess.CalledProcessError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env bash
# Monta una locución sobre un video.
# Uso: montar_video.sh <video> <voz.wav> <salida.mp4> [mezclar|reemplazar]
#   mezclar    (por defecto) conserva el audio original bajito (VOLUMEN_FONDO, por defecto 0.15)
#   reemplazar quita el audio original
# Si la voz dura más que el video, congela el último cuadro hasta que termine.
set -euo pipefail

[ -x "$HOME/.local/bin/ffmpeg" ] && PATH="$HOME/.local/bin:$PATH"

if [ $# -lt 3 ]; then
  echo "Uso: $0 <video> <voz.wav> <salida.mp4> [mezclar|reemplazar]" >&2
  exit 1
fi

VIDEO="$1"; VOZ="$2"; SALIDA="$3"; MODO="${4:-mezclar}"
VOLUMEN_FONDO="${VOLUMEN_FONDO:-0.15}"

for f in "$VIDEO" "$VOZ"; do
  [ -f "$f" ] || { echo "Error: no existe $f" >&2; exit 1; }
done
case "$MODO" in mezclar|reemplazar) ;; *) echo "Error: modo debe ser mezclar o reemplazar" >&2; exit 1;; esac

duracion() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
DUR_VIDEO=$(printf "%.1f" "$(duracion "$VIDEO")")
DUR_VOZ=$(printf "%.1f" "$(duracion "$VOZ")")
EXTRA=$(awk -v v="$DUR_VIDEO" -v a="$DUR_VOZ" 'BEGIN{d=a-v; printf "%.3f", (d>0?d+0.3:0)}')

TIENE_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$VIDEO" | head -n1)

# Video: alargar congelando el último cuadro si la voz es más larga
if [ "$EXTRA" != "0.000" ]; then
  echo "La voz (${DUR_VOZ}s) es más larga que el video (${DUR_VIDEO}s): congelo el último cuadro ${EXTRA}s."
  FILTRO_V="[0:v]tpad=stop_mode=clone:stop_duration=${EXTRA}[v]"
else
  FILTRO_V="[0:v]null[v]"
fi

# Audio: voz normalizada, opcionalmente sobre el audio original bajito
FILTRO_VOZ="[1:a]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11[voz]"
if [ "$MODO" = "mezclar" ] && [ -n "$TIENE_AUDIO" ]; then
  FILTRO_A="${FILTRO_VOZ};[0:a]aresample=48000,volume=${VOLUMEN_FONDO}[fondo];[fondo][voz]amix=inputs=2:duration=longest:normalize=0[a]"
else
  [ "$MODO" = "mezclar" ] && echo "El video no tiene audio: solo pongo la voz."
  FILTRO_A="${FILTRO_VOZ};[voz]anull[a]"
fi

mkdir -p "$(dirname "$SALIDA")"
ffmpeg -hide_banner -loglevel error -y \
  -i "$VIDEO" -i "$VOZ" \
  -filter_complex "${FILTRO_V};${FILTRO_A}" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  "$SALIDA"

echo "Listo: $SALIDA ($(duracion "$SALIDA" | awk '{printf "%.1f", $1}') s)"

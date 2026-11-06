#!/usr/bin/env bash
# Limpia una grabación de voz (mp3, m4a, ogg de WhatsApp, video...) para usarla como referencia.
# Uso: preparar_referencia.sh <grabacion> [salida.wav]
# Resultado: WAV mono 24 kHz, sin silencio al inicio, ruido reducido y volumen normalizado,
# cortado en una pausa natural cerca de DURACION segundos (por defecto 10).
# Voice Studio recomienda 3-10 s: referencias más largas pueden agotar la memoria en Macs de 8 GB.
set -euo pipefail

ENTRADA="${1:?Uso: $0 <grabacion> [salida.wav]}"
SALIDA="${2:-$(dirname "$0")/../voz/referencia.wav}"
DURACION="${DURACION:-10}"
[ -f "$ENTRADA" ] || { echo "Error: no existe $ENTRADA" >&2; exit 1; }

mkdir -p "$(dirname "$SALIDA")"
TMPDIR_REF="$(mktemp -d "${TMPDIR:-/tmp}/referencia.XXXXXX")"
trap 'rm -rf "$TMPDIR_REF"' EXIT
LIMPIO="$TMPDIR_REF/limpio.wav"

ffmpeg -hide_banner -loglevel error -y -i "$ENTRADA" -vn \
  -af "silenceremove=start_periods=1:start_threshold=-45dB,highpass=f=80,afftdn=nf=-25,loudnorm=I=-18:TP=-2" \
  -ac 1 -ar 24000 "$LIMPIO"

# Buscar la última pausa (>= 0.2 s) que empiece entre 3 s y DURACION, para no cortar una palabra
CORTE=$(ffmpeg -hide_banner -i "$LIMPIO" -af silencedetect=noise=-35dB:d=0.2 -f null - 2>&1 \
  | awk -v max="$DURACION" '/silence_start/ { t=$NF+0; if (t>=3 && t<=max) c=t } END { if (c) printf "%.2f", c+0.1; else printf "%s", max }')

ffmpeg -hide_banner -loglevel error -y -i "$LIMPIO" -t "$CORTE" -af "afade=t=out:st=$(awk -v c="$CORTE" 'BEGIN{printf "%.2f", (c>0.3?c-0.3:0)}'):d=0.3" "$SALIDA"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SALIDA")
echo "Referencia lista: $SALIDA ($(printf '%.1f' "$DUR") s)"
awk -v d="$DUR" 'BEGIN{ if (d < 4) print "Aviso: dura menos de 4 s; graba de nuevo hablando de corrido al menos 10 s." }'

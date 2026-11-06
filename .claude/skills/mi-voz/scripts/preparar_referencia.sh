#!/usr/bin/env bash
# Limpia una grabación de voz (mp3, m4a, ogg de WhatsApp, video...) para usarla como referencia.
# Uso: preparar_referencia.sh <grabacion> [salida.wav]
# Resultado: WAV mono 24 kHz, máx. 30 s, sin silencios al inicio, ruido reducido y volumen normalizado.
set -euo pipefail

ENTRADA="${1:?Uso: $0 <grabacion> [salida.wav]}"
SALIDA="${2:-$(dirname "$0")/../voz/referencia.wav}"
[ -f "$ENTRADA" ] || { echo "Error: no existe $ENTRADA" >&2; exit 1; }

mkdir -p "$(dirname "$SALIDA")"
ffmpeg -hide_banner -loglevel error -y -i "$ENTRADA" -vn \
  -af "silenceremove=start_periods=1:start_threshold=-45dB,highpass=f=80,afftdn=nf=-25,loudnorm=I=-18:TP=-2" \
  -t 30 -ac 1 -ar 24000 "$SALIDA"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SALIDA")
echo "Referencia lista: $SALIDA ($(printf '%.1f' "$DUR") s)"
awk -v d="$DUR" 'BEGIN{ if (d < 8) print "Aviso: dura menos de 8 s; con 15-30 s el clon suena más parecido." }'

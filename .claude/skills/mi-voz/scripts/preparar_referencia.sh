#!/usr/bin/env bash
# Prepara una grabación de voz (mp3, m4a, ogg de WhatsApp, video...) para usarla como referencia.
# Uso: preparar_referencia.sh <grabacion> [salida.wav]
# Resultado: WAV mono 24 kHz, sin silencio al inicio, volumen nivelado y cortado en una pausa
# natural cerca de DURACION segundos (por defecto 10). Voice Studio recomienda 3-10 s:
# referencias más largas pueden agotar la memoria en Macs de 8 GB.
# REDUCIR_RUIDO=1 aplica además reducción de ruido (solo si la grabación tiene ruido de fondo
# evidente: Voice Studio ya limpia la referencia y un doble filtrado puede empeorar la voz).
set -euo pipefail

[ -x "$HOME/.local/bin/ffmpeg" ] && PATH="$HOME/.local/bin:$PATH"

ENTRADA="${1:?Uso: $0 <grabacion> [salida.wav]}"
SALIDA="${2:-$(dirname "$0")/../voz/referencia.wav}"
DURACION="${DURACION:-10}"
[ -f "$ENTRADA" ] || { echo "Error: no existe $ENTRADA" >&2; exit 1; }

FILTROS="silenceremove=start_periods=1:start_threshold=-45dB,highpass=f=70"
[ "${REDUCIR_RUIDO:-0}" = "1" ] && FILTROS="$FILTROS,afftdn=nf=-30"
FILTROS="$FILTROS,loudnorm=I=-18:TP=-2"

mkdir -p "$(dirname "$SALIDA")"
TMPDIR_REF="$(mktemp -d "${TMPDIR:-/tmp}/referencia.XXXXXX")"
trap 'rm -rf "$TMPDIR_REF"' EXIT
LIMPIO="$TMPDIR_REF/limpio.wav"

ffmpeg -hide_banner -loglevel error -y -i "$ENTRADA" -vn -af "$FILTROS" -ac 1 -ar 24000 "$LIMPIO"

# Cortar en una pausa (>= 0.2 s): la última entre 3 s y DURACION; si no hay, la primera hasta
# 1.5 s después de DURACION; si tampoco, exactamente en DURACION.
CORTE=$(ffmpeg -hide_banner -i "$LIMPIO" -af silencedetect=noise=-35dB:d=0.2 -f null - 2>&1 \
  | awk -v max="$DURACION" '
      /silence_start/ { t=$NF+0; if (t>=3 && t<=max) antes=t; else if (t>max && t<=max+1.5 && !despues) despues=t }
      END { if (antes) printf "%.2f", antes+0.1; else if (despues) printf "%.2f", despues+0.1; else printf "%s", max }')

INICIO_FADE=$(awk -v c="$CORTE" 'BEGIN{printf "%.2f", (c>0.3?c-0.3:0)}')
ffmpeg -hide_banner -loglevel error -y -i "$LIMPIO" -t "$CORTE" -af "afade=t=out:st=$INICIO_FADE:d=0.3" "$SALIDA"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SALIDA")
echo "Referencia lista: $SALIDA ($(printf '%.1f' "$DUR") s)"
awk -v d="$DUR" 'BEGIN{ if (d < 4) print "Aviso: dura menos de 4 s; graba de nuevo hablando de corrido al menos 10 s." }'

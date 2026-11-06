# Skill "mi-voz": tu voz en tus videos

Le pides a Claude "ponle mi voz a este video" y él usa (o escribe) tu guion, lo lee con tu voz clonada y lo monta en el video.

Genera la voz con [Voice Studio](https://github.com/debpalash/voicestudio): código abierto (AGPL-3.0), corre en tu computadora, sin cuenta ni pagos. Usarlo para los videos de tu marca está permitido; la licencia solo pide compartir el código si modificas Voice Studio y lo ofreces como servicio a otros.

## Preparación (una sola vez)

1. **Instala Voice Studio**: descárgalo de <https://github.com/debpalash/VoiceStudio/releases/latest> y ábrelo. La primera vez te pedirá descargar el modelo de voz.
2. **Clona tu voz**: graba de 15 a 30 segundos hablando natural, como en tus videos, en un lugar silencioso, cerca del micrófono y sin música (sirve una nota de voz del celular). Con Voice Studio abierto:
   ```bash
   python3 .claude/skills/mi-voz/scripts/crear_perfil.py mi_grabacion.m4a --es-mi-voz
   ```
   Limpia la grabación, corta unos 10 segundos en una pausa natural (más largo agota la memoria en Macs de 8 GB), **la transcribe** para que el texto coincida exacto con tu audio y crea el perfil **Mi voz**. Tu grabación **no se sube a GitHub** (está en `.gitignore`).
3. **Instala ffmpeg** (para montar el audio en el video):
   - Mac: `brew install ffmpeg`
   - Windows: `winget install ffmpeg`

Para usar el skill basta el Python 3 que ya trae la Mac (3.9 o superior); no necesitas instalar nada más.

## Uso

Con Voice Studio abierto, abre Claude Code en la carpeta del repo y pide, por ejemplo:

> Ponle mi voz a `videos/receta_batido.mp4` con este guion: "..."

> Escríbeme un guion de 30 segundos sobre el batido verde y ponlo con mi voz en `videos/batido.mp4`

> Narra el reel `SOCIAL NO TE VEN/NO_TE_VEN_error_03_sin_audio.mp4` con mi voz, frase por frase con cada escena

El video final queda en `salidas/`. Cada frase se transcribe para comprobar que se entiende; si no, se regenera (hasta 3 intentos).

### Uso manual (sin Claude)

```bash
python3 .claude/skills/mi-voz/scripts/generar_voz.py --listar-voces

python3 .claude/skills/mi-voz/scripts/generar_voz.py --texto "Hola, soy de Fit max orgánic." --salida salidas/voz.wav

bash .claude/skills/mi-voz/scripts/montar_video.sh videos/mi_video.mp4 salidas/voz.wav salidas/final.mp4 mezclar

# Reels por escenas: ver escenas, escribir guion (segundo<TAB>frase) y narrar
python3 .claude/skills/mi-voz/scripts/narrar_por_escenas.py --detectar videos/reel.mp4 --carpeta salidas/reel
python3 .claude/skills/mi-voz/scripts/narrar_por_escenas.py --guion salidas/reel/guion.txt --video videos/reel.mp4 --salida salidas/reel_CON_MI_VOZ.mp4
```

## Respaldo: Chatterbox

Si no puedes usar Voice Studio, el script también funciona con [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT), usando directamente tu grabación:

```bash
pip install -r .claude/skills/mi-voz/requirements.txt
python .claude/skills/mi-voz/scripts/generar_voz.py --motor chatterbox \
  --referencia .claude/skills/mi-voz/voz/referencia.wav --texto "Hola" --salida salidas/voz.wav
```

## Uso responsable

Clona solo tu propia voz o la de alguien que te haya dado permiso. Voice Studio añade una marca de agua inaudible al audio generado.

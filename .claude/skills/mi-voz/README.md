# Skill "mi-voz": tu voz en tus videos

Le pides a Claude "ponle mi voz a este video" y él usa (o escribe) tu guion, lo lee con tu voz clonada y lo monta en el video.

Genera la voz con [Voice Studio](https://github.com/debpalash/voicestudio): código abierto (AGPL-3.0), corre en tu computadora, sin cuenta ni pagos. Usarlo para los videos de tu marca está permitido; la licencia solo pide compartir el código si modificas Voice Studio y lo ofreces como servicio a otros.

## Preparación (una sola vez)

1. **Instala Voice Studio**: descárgalo de <https://github.com/debpalash/VoiceStudio/releases/latest> y ábrelo. La primera vez te pedirá descargar el modelo de voz.
2. **Clona tu voz**: graba de 15 a 30 segundos hablando natural, como en tus videos, en un lugar silencioso y sin música (sirve una nota de voz del celular). En la app, entra a **Voice cloning**, sube la grabación y guárdala como perfil con el nombre **Mi voz**.
   - Si la grabación tiene ruido, primero límpiala con:
     ```bash
     bash .claude/skills/mi-voz/scripts/preparar_referencia.sh mi_grabacion.m4a
     ```
     y sube `.claude/skills/mi-voz/voz/referencia.wav`. Ese archivo **no se sube a GitHub** (está en `.gitignore`), porque es tu voz.
3. **Instala ffmpeg** (para montar el audio en el video):
   - Mac: `brew install ffmpeg`
   - Windows: `winget install ffmpeg`

Para usar el skill, Python 3.10 o superior basta; no necesitas instalar nada más.

## Uso

Con Voice Studio abierto, abre Claude Code en la carpeta del repo y pide, por ejemplo:

> Ponle mi voz a `videos/receta_batido.mp4` con este guion: "..."

> Escríbeme un guion de 30 segundos sobre el batido verde y ponlo con mi voz en `videos/batido.mp4`

El video final queda en `salidas/`.

### Uso manual (sin Claude)

```bash
python .claude/skills/mi-voz/scripts/generar_voz.py --listar-voces

python .claude/skills/mi-voz/scripts/generar_voz.py --texto "Hola, soy de Fitmax" --salida salidas/voz.wav

bash .claude/skills/mi-voz/scripts/montar_video.sh videos/mi_video.mp4 salidas/voz.wav salidas/final.mp4 mezclar
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

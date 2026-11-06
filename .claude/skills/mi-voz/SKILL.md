---
name: mi-voz
description: Pone la voz clonada del usuario como locución en sus videos. Úsalo cuando pida "ponle mi voz a este video", "narra este video con mi voz", "hazme una locución con mi voz" o "dobla este video con mi voz". Genera el audio con Voice Studio (código abierto, corre en la computadora del usuario) y lo monta en el video con ffmpeg.
---

# Mi voz en los videos

Convierte un guion en audio con la voz del usuario y lo monta sobre un video.

Todas las rutas son relativas a la raíz del repositorio. Carpeta del skill: `.claude/skills/mi-voz/`.

## Antes de empezar (revisa esto siempre)

1. **Voice Studio abierto**: comprueba con `curl -s http://localhost:3900/health`.
   - Si no responde, pide al usuario que abra la app Voice Studio y espere a que cargue. No instales otra copia.
   - Si el usuario usa otra dirección, va en la variable `VOICESTUDIO_URL`.
2. **Perfil con su voz**: ejecuta `python .claude/skills/mi-voz/scripts/generar_voz.py --listar-voces`.
   - Si no hay perfiles: pide una grabación de 15 a 30 segundos (hablando natural, sin ruido ni música). Prepárala con `bash .claude/skills/mi-voz/scripts/preparar_referencia.sh <grabacion> .claude/skills/mi-voz/voz/referencia.wav` (limpia y corta unos 10 s en una pausa natural) y súbela en Voice Studio, sección **Voice cloning**, como perfil **Mi voz**. Sube siempre la versión preparada: las referencias largas agotan la memoria en Macs de 8 GB.
   - Clona solo la voz del usuario o la de alguien que lo haya autorizado.
   - Si su perfil tiene otro nombre, pásalo con `--voz "<nombre>"`.
3. **ffmpeg**: comprueba con `ffmpeg -version`.

## Flujo

### 1. Guion
- Si el usuario dio el texto, úsalo tal cual (corrige solo errores evidentes y avísale).
- Si pidió que lo escribas, redáctalo en su tono: frases cortas, para decirlo en voz alta. Muéstraselo y espera su visto bueno antes de generar el audio.
- Calcula la duración: unas 150 palabras por minuto. Para un video de 30 s, el guion debe tener cerca de 75 palabras.
- Guárdalo en `salidas/<nombre>_guion.txt`.

### 2. Generar la voz
```bash
python .claude/skills/mi-voz/scripts/generar_voz.py \
  --guion salidas/<nombre>_guion.txt \
  --salida salidas/<nombre>_voz.wav
```
Opciones útiles:
- `--voz "<perfil>"`: nombre del perfil en Voice Studio (por defecto "Mi voz").
- `--estilo "enérgico y alegre"`: indicación de tono (depende del motor elegido en Voice Studio).
- `--velocidad 1.1`: un poco más rápido (de 0.25 a 4.0).
- `--idioma es`: código de idioma (por defecto `es`).
- `--pausa 0.25`: segundos de silencio entre fragmentos.

El script divide los guiones largos en fragmentos y luego los une. Si Voice Studio responde con un error (falta un modelo, perfil no encontrado, equipo ocupado), muestra el mensaje al usuario. No descargues modelos sin su permiso.

**Respaldo sin Voice Studio**: si el usuario no puede usar la app, existe `--motor chatterbox --referencia .claude/skills/mi-voz/voz/referencia.wav` (requiere `pip install -r .claude/skills/mi-voz/requirements.txt`). Ofrécelo solo si Voice Studio no es una opción.

### 3. Montar en el video
```bash
bash .claude/skills/mi-voz/scripts/montar_video.sh <video.mp4> salidas/<nombre>_voz.wav salidas/<nombre>_final.mp4 [modo]
```
Modos:
- `mezclar` (por defecto): conserva el audio original del video (música, ambiente) bajito y pone la voz encima.
- `reemplazar`: quita el audio original y deja solo la voz.

Si la voz dura más que el video, el script congela el último cuadro hasta que termine. Si dura mucho menos, avisa al usuario y ofrécele alargar el guion.

Para cambiar el volumen del audio original en modo `mezclar`, antepón `VOLUMEN_FONDO=0.25` al comando (por defecto 0.15).

### 4. Entrega
Indica al usuario dónde quedó el video final y cuánto dura (según lo que imprime el script, no lo supongas), y pregúntale si quiere cambiar el tono, la velocidad o el guion.

## Problemas comunes
- **"Not enough free memory to prepare this voice reference"** (pasa en Macs de 8 GB): la referencia del perfil es muy larga. Prepara una de unos 10 s con `preparar_referencia.sh` (ya corta en una pausa cerca de los 10 s por defecto; `DURACION=7` para más corta), crea un perfil nuevo con ella y pide al usuario cerrar apps pesadas (Chrome con muchas pestañas, por ejemplo).
- **No suena como el usuario**: la grabación del perfil tiene ruido, música o es muy corta. Pide una grabación más limpia, prepárala con `preparar_referencia.sh` y rehaz el perfil.
- **Pronuncia mal marcas o palabras en inglés**: escríbelas en el guion como se pronuncian (por ejemplo, "Fit max orgánic").
- **Muy lento**: sin tarjeta gráfica NVIDIA o un Mac con chip M, generar audio tarda varios minutos. Es normal.

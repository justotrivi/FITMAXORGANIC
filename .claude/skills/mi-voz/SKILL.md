---
name: mi-voz
description: Pone la voz clonada del usuario como locución en sus videos. Úsalo cuando pida "ponle mi voz a este video", "narra este video con mi voz", "hazme una locución con mi voz" o "dobla este video con mi voz". Genera el audio con Voice Studio (código abierto, corre en la computadora del usuario), verifica que cada frase se entienda y lo monta en el video con ffmpeg, sincronizado con las escenas.
---

# Mi voz en los videos

Rutas relativas a la raíz del repositorio. Scripts en `.claude/skills/mi-voz/scripts/`.
Todo corre en la computadora del usuario (Voice Studio escucha en `http://localhost:3900`).

## 0. Antes de empezar (revisa siempre)

1. **Voice Studio abierto**: `curl -s http://localhost:3900/health`. Si no responde, pide al usuario abrir la app y esperar a que cargue. No instales otra copia.
2. **Memoria**: en Macs de 8 GB, generar voz necesita ~1,5 GB libres. Si falla con "memoria", pide cerrar Chrome y apps pesadas (dejar solo Claude y Voice Studio) y reintenta. No pruebes otra cosa antes.
3. **Reconocimiento de voz** (para verificar frases y transcribir la referencia): si `vs.transcribir` dice que falta un modelo, selecciona uno ya instalado:
   ```bash
   curl -X POST http://localhost:3900/engines/select -H 'Content-Type: application/json' -d '{"family":"asr","backend_id":"faster-whisper","model_id":"deepdml/faster-whisper-large-v3-turbo-ct2"}'
   ```
   Consulta `GET /models` para ver qué está instalado. No descargues modelos sin permiso del usuario (pesan GB).
4. **Perfil de voz**: `python3 .claude/skills/mi-voz/scripts/generar_voz.py --listar-voces`. Si no existe "Mi voz", ve al paso 1.

## 1. Crear el perfil de voz (una sola vez)

- Pide una grabación de 15 a 30 s: hablando natural, como en sus videos, en un lugar silencioso, a un palmo del micrófono, sin música.
  - Si Claude está conectado a la Mac, puede grabar con el micrófono: lista los dispositivos con `ffmpeg -f avfoundation -list_devices true -i ""` (el número cambia si se conecta o desconecta el iPhone; revísalo justo antes) y graba con `ffmpeg -f avfoundation -i ":<n>" -t 35 -ac 1 -ar 48000 .claude/skills/mi-voz/voz/grabacion_original.wav`. Dale un texto para leer y que empiece al mandar "listo".
- Crea el perfil:
  ```bash
  python3 .claude/skills/mi-voz/scripts/crear_perfil.py <grabacion> --es-mi-voz
  ```
  Esto limpia la grabación, corta unos 10 s en una pausa natural, **la transcribe** y crea o actualiza el perfil "Mi voz" con ese texto exacto. Usa `--es-mi-voz` solo si el usuario confirmó que la voz es suya.
- **Nunca escribas a mano el texto de la referencia ni lo copies del guion que se leyó.** Si no coincide palabra por palabra con lo que se oye, el modelo mezcla pedazos de la grabación en las frases nuevas ("Hola", "lleva"... donde no van). Si no hay reconocimiento de voz, escucha/pide la transcripción exacta y pásala con `--texto-referencia`.
- La grabación del usuario no se sube a git (`.gitignore`). Clona solo su voz o la de alguien que lo haya autorizado.

## 2. Escribir frases que se entiendan

Aplica estas reglas al guion (lo escriba el usuario o tú):
- **Frases completas**, que se entiendan solas. Nada de empezar con "...", minúscula o "y". Si en pantalla la frase continúa la anterior ("…la trata como"), dale sujeto: "Instagram la trata como…".
- **Números en letras**: "Error tres de diez", no "Error 3/10".
- **Marcas, siglas y palabras en inglés como se pronuncian**: "Fit max orgánic", "reel" → "ril" si suena raro.
- Frases cortas (menos de ~20 palabras).
- **Llena las escenas, sin silencios largos**: a velocidad 1.1 la voz dice ~2,6 palabras por segundo. Apunta a ocupar ~85 % de cada escena: (duración de la escena − 0,5 s) × 2,6 palabras. Una escena de 5 s lleva ~11 palabras; una de 7 s, ~16.
- **Tono de reel, con energía**: frases con gancho y directas a la persona ("Ojo con esto", "te lo digo en serio", "así de simple"), ejemplos concretos, verbos en imperativo. Amplía lo que dice la pantalla, no lo repitas palabra por palabra.
- Muestra el guion al usuario y espera su visto bueno antes de generar.

## 3a. Locución continua (un video, una narración)

```bash
python3 .claude/skills/mi-voz/scripts/generar_voz.py --guion salidas/<nombre>/guion.txt --salida salidas/<nombre>/voz.wav
bash .claude/skills/mi-voz/scripts/montar_video.sh <video> salidas/<nombre>/voz.wav salidas/<nombre>_CON_MI_VOZ.mp4 [mezclar|reemplazar]
```

## 3b. Narración por escenas (reels con textos animados)

1. Detecta escenas y mira el texto de cada una:
   ```bash
   python3 .claude/skills/mi-voz/scripts/narrar_por_escenas.py --detectar <video> --carpeta salidas/<nombre>
   ```
   Lee la imagen `salidas/<nombre>/escenas.jpg` para ver el texto. Si una escena tiene animación sin corte, puede traer dos frases: saca cuadros extra con ffmpeg (`-ss <seg> -frames:v 1`) para ubicar el segundo exacto.
2. Escribe `salidas/<nombre>/guion.txt`, un renglón por frase: `segundo<TAB>frase` (aplica las reglas del paso 2).
3. Genera, verifica, acomoda y monta:
   ```bash
   python3 .claude/skills/mi-voz/scripts/narrar_por_escenas.py --guion salidas/<nombre>/guion.txt --video <video> --salida salidas/<nombre>_CON_MI_VOZ.mp4
   ```
   `--modo mezclar` si el video tiene música que se debe conservar (por defecto `reemplazar`).
   Si una frase no cabe en su escena (aviso "se corre"), acórtala en el guion y vuelve a correr: solo se regeneran las frases cambiadas.

## Calidad: qué hacen los scripts y opciones

- Cada frase se genera con 32 pasos de refinamiento (`--pasos`; 16 es más rápido y peor) y luego **se transcribe para comprobar que se entiende**. Si se parece menos de 85 % al texto (`--umbral`), se regenera con otra variación, hasta 3 intentos (`--intentos`), y se queda la mejor.
- Las frases que sigan mal se listan al final: reescríbelas según el paso 2. `--sin-verificar` salta la comprobación (más rápido, sin garantía).
- **Energía**: el motor (OmniVoice) no tiene control de "emoción"; copia la forma de hablar de la grabación de referencia. Para una voz más activa:
  - Por defecto se aplica un procesado de locutor (compresión, presencia, −14 LUFS, el estándar de Instagram/TikTok). `--voz-natural` lo desactiva.
  - `narrar_por_escenas.py` usa `--velocidad 1.1` por defecto (más ágil); `generar_voz.py` usa 1.0. Baja a 1.0 si suena apurada.
  - Lo que más cambia la energía es **regrabar la referencia hablando como en un reel** (con ánimo, más fuerte, sonriendo) y rehacer el perfil con `crear_perfil.py`.
  - `--estilo` solo acepta etiquetas de diseño de voz de OmniVoice (género, edad, tono grave/agudo, susurro, acento); no sirve para "enérgico".
- Cada frase tarda ~1-2 min en una Mac M2 de 8 GB (más con verificación). Avisa al usuario cuánto falta.

## 4. Entrega

Di dónde quedó el video, cuánto dura y el porcentaje con que se entiende cada frase (lo imprime el script). Tú no puedes escuchar el resultado: pide al usuario que lo revise y te diga qué frase ajustar.

## Problemas comunes
- **Aparecen palabras de la grabación de referencia** ("Hola", "lleva"...): el texto de la referencia no coincide con el audio. Rehaz el perfil con `crear_perfil.py` (transcribe solo).
- **"Not enough free memory"**: cerrar apps (ver paso 0). Si persiste, rehaz el perfil con `--duracion 7`.
- **Una frase se entiende mal en todos los intentos**: reescríbela más simple; si son todas, la grabación es mala (lejos del micrófono, eco, ruido): graba de nuevo.
- **Respaldo sin Voice Studio**: `generar_voz.py --motor chatterbox --referencia <wav>` (requiere `pip install -r .claude/skills/mi-voz/requirements.txt`). Solo si Voice Studio no es una opción.

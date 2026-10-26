# FitMax Studio — Editor de fotos para redes

Editor de fotos estilo Lightroom para preparar el contenido de FITMAXORGANIC para Instagram, TikTok y YouTube.
Todo se procesa en el navegador: las fotos no se suben a ningún servidor.

## Cómo usarlo

```bash
npm install
npm run dev
```

Abre http://localhost:3000 y arrastra tus fotos (JPG, PNG o WEBP).

## Funciones

- **Luz:** exposición, contraste, iluminaciones, sombras, blancos y negros.
- **Color:** temperatura, matiz, intensidad y saturación.
- **Efectos:** claridad, nitidez, desvanecer (look mate), viñeta y grano.
- **Mezcla de color (HSL):** tono, saturación y luminancia de 8 colores.
- **Looks de la marca:** FM Mediterráneo, FM Golden Pool y FM Film Verano. También están como presets de Lightroom en [`lightroom-presets/`](lightroom-presets/README.md).
- **Gradación de color:** tono y saturación para sombras e iluminaciones.
- **Presets:** Orgánico Cálido, Fitness Punch, Verde Fresco, Mate Lifestyle, Moody Gym, B&N Atlético y Golden Hour.
  También puedes guardar los tuyos.
- **Recorte para redes:** 4:5 feed (1080×1350), 1:1 (1080×1080), 9:16 story/reel (1080×1920), 16:9 (1920×1080) u original.
  Para encuadrar, arrastra la foto. También puedes hacer zoom, girarla y voltearla.
- **Edición por lotes:** importa varias fotos, copia y pega ajustes o aplícalos a todas, y exporta todas de una vez.
- Histograma, vista antes/después, deshacer y rehacer.

## Atajos

| Tecla | Acción |
| --- | --- |
| `\` | Antes / después |
| `R` | Recortar |
| `Ctrl/Cmd + Z` · `Ctrl/Cmd + Shift + Z` | Deshacer · Rehacer |
| `Ctrl/Cmd + Shift + C` / `V` | Copiar / pegar ajustes |
| `←` `→` | Foto anterior / siguiente |
| Doble clic en un ajuste | Restablecerlo |

## Estructura

- `lib/editor/pipeline.js`: procesado de píxeles (curva tonal, balance de blancos, HSL, viñeta, etc.). No depende del DOM.
- `lib/editor/render.js`: carga, recorte, vista previa y exportación con canvas.
- `lib/editor/params.js` y `lib/editor/presets.js`: definición de ajustes, formatos y presets.
- `components/editor/`: interfaz.

`npm test` ejecuta las pruebas del motor de procesado.

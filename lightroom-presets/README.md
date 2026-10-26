# Presets de Lightroom — FITMAXORGANIC

Tres looks de "verano mediterráneo" hechos a partir de las fotos de referencia de la marca:

| Preset | Look | Ideal para |
| --- | --- | --- |
| **FM Mediterráneo** | Vivo y nítido, agua azul profunda, rojos intensos, luz cálida | Comida, producto, platos al sol |
| **FM Golden Pool** | Sol duro y dorado, sombras verde azulado profundas | Piscina, bebidas, lifestyle con sombras marcadas |
| **FM Film Verano** | Mate tipo película, negros levantados, tonos tierra y grano | Momentos, detalles, contenido más editorial |

## Cómo instalarlos

**Lightroom móvil (iPhone/Android)**
1. Descarga `FITMAXORGANIC-presets.zip` en el teléfono.
2. Abre una foto en Lightroom, ve a **Ajustes preestablecidos**, toca **⋯** y luego **Importar ajustes preestablecidos**.
3. Elige el `.zip`. Los presets aparecen en el grupo **FITMAXORGANIC**.

**Lightroom (escritorio, el de la nube)**
Ve a **Archivo › Importar perfiles y ajustes preestablecidos** y elige el `.zip`.

**Lightroom Classic**
En el módulo **Revelar**, panel **Ajustes preestablecidos**, toca **+** y luego **Importar ajustes preestablecidos**. Elige el `.zip`.

Con instalarlos una vez en Lightroom de escritorio (el de la nube) también aparecen en el móvil.

## Consejos

- **Ajusta la exposición en cada foto.** Los presets dan el color y el estilo, pero cada foto tiene su propia luz.
- **Fotos RAW:** la temperatura del preset solo se aplica a fotos JPG o del móvil. En RAW, sube la **Temperatura** a mano unos +300 a +600 K para conseguir el tono cálido.
- **Tonos de piel:** si quedan muy naranjas, baja la **Saturación del Naranja** en *Mezcla de colores*.

## Valores (por si prefieres escribirlos a mano)

| Ajuste | Mediterráneo | Golden Pool | Film Verano |
| --- | --- | --- | --- |
| Exposición | +0.10 | 0 | +0.05 |
| Contraste | +20 | +30 | -10 |
| Iluminaciones | -45 | -35 | -60 |
| Sombras | +15 | -15 | +10 |
| Blancos | +15 | +20 | -25 |
| Negros | -20 | -25 | +15 |
| Textura / Claridad / Neblina | +15 / +10 / +8 | +10 / +8 / +5 | +5 / -5 / 0 |
| Intensidad / Saturación | +15 / +5 | +5 / -10 | -5 / -15 |
| Gradación: sombras (tono, sat.) | 200°, 15 | 165°, 22 | 45°, 12 |
| Gradación: iluminaciones (tono, sat.) | 40°, 15 | 35°, 22 | 35°, 18 |
| HSL verde (tono / sat. / lum.) | +15 / -20 / -10 | +40 / -30 / -25 | +30 / -40 / -20 |
| HSL aguamarina (tono / sat. / lum.) | +10 / +10 / -15 | -10 / -20 / -25 | -15 / -15 / -10 |
| HSL azul (tono / sat. / lum.) | -10 / +15 / -20 | 0 / -40 / -20 | -20 / -30 / 0 |
| Viñeta | -10 | -15 | -20 |
| Grano | 0 | 10 | 25 |

Estos presets se generan desde `lib/editor/looks.js` con `npm run lightroom-presets`, y los mismos looks están en el editor FitMax Studio.

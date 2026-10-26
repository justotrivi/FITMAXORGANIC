// Looks "verano mediterráneo" calibrados a partir de las fotos de referencia de la marca.
// Cada look tiene su versión para este editor (`params`) y para Lightroom (`lightroom`,
// con los nombres de ajustes de Camera Raw). `npm run lightroom-presets` genera los .xmp.

const HSL_KEYS = { red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', aqua: 'Aqua', blue: 'Blue', purple: 'Purple', magenta: 'Magenta' };

export const LOOKS = [
  {
    id: 'fm-mediterraneo',
    name: 'FM Mediterráneo',
    description: 'Vivo y nítido: agua azul profunda, rojos intensos y luz cálida (referencia 1).',
    params: {
      exposure: 0.1, contrast: 20, highlights: -40, shadows: 15, whites: 15, blacks: -20,
      temperature: 8, tint: 3, vibrance: 15, saturation: 5,
      shadowHue: 200, shadowSat: 15, highlightHue: 40, highlightSat: 15,
      clarity: 15, sharpen: 15, vignette: -10,
      hsl: {
        red: { s: 10, l: -5 }, orange: { h: -3, s: 5, l: 5 }, yellow: { h: -10, s: -10 },
        green: { h: 15, s: -20, l: -10 }, aqua: { h: 10, s: 10, l: -15 }, blue: { h: -10, s: 15, l: -20 },
      },
    },
    lightroom: {
      Exposure2012: 0.1, Contrast2012: 20, Highlights2012: -45, Shadows2012: 15, Whites2012: 15, Blacks2012: -20,
      Texture: 15, Clarity2012: 10, Dehaze: 8, Vibrance: 15, Saturation: 5,
      IncrementalTemperature: 8, IncrementalTint: 3,
      ColorGradeShadowHue: 200, ColorGradeShadowSat: 15, ColorGradeHighlightHue: 40, ColorGradeHighlightSat: 15,
      ColorGradeBlending: 50, SplitToningBalance: -10,
      PostCropVignetteAmount: -10,
      Sharpness: 40,
      toneCurve: [[0, 0], [64, 60], [128, 128], [192, 196], [255, 255]],
    },
  },
  {
    id: 'fm-golden-pool',
    name: 'FM Golden Pool',
    description: 'Sol duro y dorado con sombras verde azulado profundas (referencia 2).',
    params: {
      contrast: 30, highlights: -35, shadows: -15, whites: 20, blacks: -25,
      temperature: 15, tint: 5, vibrance: 5, saturation: -10,
      shadowHue: 165, shadowSat: 22, highlightHue: 35, highlightSat: 22,
      clarity: 10, fade: 8, vignette: -15, grain: 10,
      hsl: {
        red: { s: 5 }, orange: { s: -5, l: 8 }, yellow: { h: -15, s: -20, l: 5 },
        green: { h: 40, s: -30, l: -25 }, aqua: { h: -10, s: -20, l: -25 }, blue: { s: -40, l: -20 },
      },
    },
    lightroom: {
      Exposure2012: 0, Contrast2012: 30, Highlights2012: -35, Shadows2012: -15, Whites2012: 20, Blacks2012: -25,
      Texture: 10, Clarity2012: 8, Dehaze: 5, Vibrance: 5, Saturation: -10,
      IncrementalTemperature: 15, IncrementalTint: 5,
      ColorGradeShadowHue: 165, ColorGradeShadowSat: 22, ColorGradeHighlightHue: 35, ColorGradeHighlightSat: 22,
      ColorGradeBlending: 60, SplitToningBalance: 10,
      PostCropVignetteAmount: -15,
      GrainAmount: 10, GrainSize: 20, GrainFrequency: 50,
      Sharpness: 30,
      toneCurve: [[0, 10], [64, 58], [128, 130], [192, 200], [255, 250]],
    },
  },
  {
    id: 'fm-film-verano',
    name: 'FM Film Verano',
    description: 'Mate tipo película: negros levantados, tonos tierra cálidos y grano (referencia 3).',
    params: {
      exposure: 0.05, contrast: -10, highlights: -60, shadows: 10, whites: -25, blacks: 15,
      temperature: 12, vibrance: -5, saturation: -15,
      shadowHue: 45, shadowSat: 12, highlightHue: 35, highlightSat: 18,
      clarity: -5, fade: 30, vignette: -20, grain: 25,
      hsl: {
        red: { s: 15, l: -5 }, orange: { h: 5, s: 5 }, yellow: { h: -15, s: -25 },
        green: { h: 30, s: -40, l: -20 }, aqua: { h: -15, s: -15, l: -10 }, blue: { h: -20, s: -30 },
      },
    },
    lightroom: {
      Exposure2012: 0.05, Contrast2012: -10, Highlights2012: -60, Shadows2012: 10, Whites2012: -25, Blacks2012: 15,
      Texture: 5, Clarity2012: -5, Dehaze: 0, Vibrance: -5, Saturation: -15,
      IncrementalTemperature: 12, IncrementalTint: 0,
      ColorGradeShadowHue: 45, ColorGradeShadowSat: 12, ColorGradeHighlightHue: 35, ColorGradeHighlightSat: 18,
      ColorGradeMidtoneHue: 40, ColorGradeMidtoneSat: 5,
      ColorGradeBlending: 70, SplitToningBalance: 0,
      PostCropVignetteAmount: -20,
      GrainAmount: 25, GrainSize: 30, GrainFrequency: 50,
      Sharpness: 25,
      toneCurve: [[0, 30], [60, 70], [128, 128], [200, 190], [255, 230]],
    },
  },
];

const signed = (v) => (v > 0 ? `+${v}` : `${v}`);

function hslAttributes(hsl = {}) {
  const attrs = {};
  for (const [band, name] of Object.entries(HSL_KEYS)) {
    const v = hsl[band] || {};
    attrs[`HueAdjustment${name}`] = v.h || 0;
    attrs[`SaturationAdjustment${name}`] = v.s || 0;
    attrs[`LuminanceAdjustment${name}`] = v.l || 0;
  }
  return attrs;
}

// UUID determinista a partir del id, para que reimportar actualice el mismo preset.
function uuidFor(id) {
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (const ch of id) {
    h1 = Math.imul(h1 ^ ch.charCodeAt(0), 16777619) >>> 0;
    h2 = Math.imul(h2 ^ ch.charCodeAt(0), 2246822507) >>> 0;
  }
  const hex = (n) => n.toString(16).padStart(8, '0').toUpperCase();
  return hex(h1) + hex(h2) + hex((h1 ^ h2) >>> 0) + hex((Math.imul(h1, 31) ^ h2) >>> 0);
}

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// Genera el contenido de un preset .xmp compatible con Lightroom (Classic, CC y móvil) y Camera Raw.
export function lookToXmp(look, group = 'FITMAXORGANIC') {
  const { toneCurve, ...settings } = look.lightroom;
  const attrs = {
    PresetType: 'Normal',
    Cluster: '',
    UUID: uuidFor(look.id),
    SupportsAmount: 'False',
    SupportsColor: 'True',
    SupportsMonochrome: 'True',
    SupportsHighDynamicRange: 'True',
    SupportsNormalDynamicRange: 'True',
    SupportsSceneReferred: 'True',
    SupportsOutputReferred: 'True',
    CameraModelRestriction: '',
    Copyright: '',
    ContactInfo: '',
    Version: '15.0',
    ProcessVersion: '11.0',
    ...settings,
    ...hslAttributes(look.params.hsl),
    PostCropVignetteMidpoint: 50,
    PostCropVignetteFeather: 50,
    PostCropVignetteRoundness: 0,
    PostCropVignetteStyle: 1,
    ToneCurveName2012: 'Custom',
    HasSettings: 'True',
  };
  const lines = Object.entries(attrs).map(([k, v]) => `   crs:${k}="${typeof v === 'number' ? signed(v) : escapeXml(String(v))}"`);
  const curve = (toneCurve || [[0, 0], [255, 255]]).map(([x, y]) => `      <rdf:li>${x}, ${y}</rdf:li>`).join('\n');
  const linear = '      <rdf:li>0, 0</rdf:li>\n      <rdf:li>255, 255</rdf:li>';
  const seq = (name, body) => `   <crs:${name}>\n    <rdf:Seq>\n${body}\n    </rdf:Seq>\n   </crs:${name}>`;
  const alt = (name, text) =>
    `   <crs:${name}>\n    <rdf:Alt>\n     <rdf:li xml:lang="x-default">${escapeXml(text)}</rdf:li>\n    </rdf:Alt>\n   </crs:${name}>`;

  return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
${lines.join('\n')}>
${alt('Name', look.name)}
${alt('ShortName', '')}
${alt('SortName', '')}
${alt('Group', group)}
${alt('Description', look.description)}
${seq('ToneCurvePV2012', curve)}
${seq('ToneCurvePV2012Red', linear)}
${seq('ToneCurvePV2012Green', linear)}
${seq('ToneCurvePV2012Blue', linear)}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`;
}

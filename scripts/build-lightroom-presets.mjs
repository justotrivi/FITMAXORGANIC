// Genera los presets .xmp de Lightroom en lightroom-presets/ a partir de lib/editor/looks.js.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { LOOKS, lookToXmp } from '../lib/editor/looks.js';

const outDir = new URL('../lightroom-presets/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const files = [];
for (const look of LOOKS) {
  const filename = `${look.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')}.xmp`;
  writeFileSync(new URL(filename, outDir), lookToXmp(look));
  files.push(filename);
  console.log(`✓ ${filename}`);
}

try {
  execFileSync('zip', ['-q', '-j', '-FS', 'FITMAXORGANIC-presets.zip', ...files], { cwd: outDir });
  console.log('✓ FITMAXORGANIC-presets.zip');
} catch {
  console.log('(zip no disponible: se generaron solo los .xmp)');
}

/**
 * scripts/build-models.js
 *
 * Reads the files in models/, validates them as JSON, and copies them to the
 * project root (where EDS / Universal Editor expects them).
 *
 * Usage: node scripts/build-models.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODELS_DIR = join(ROOT, 'models');

const MODEL_FILES = [
  'component-models.json',
  'component-definitions.json',
  'component-filters.json',
];

let processed = 0;
let errors = 0;

console.log('🔧  Building content models...\n');

for (const fileName of MODEL_FILES) {
  const srcPath = join(MODELS_DIR, fileName);
  const destPath = join(ROOT, fileName);

  try {
    const raw = readFileSync(srcPath, 'utf-8');
    // Validate JSON
    const parsed = JSON.parse(raw);
    const count = Array.isArray(parsed)
      ? parsed.length
      : Object.keys(parsed).length;

    // Copy to root (pretty-printed for readability)
    writeFileSync(destPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
    console.log(`  ✅  ${fileName} → ${destPath} (${count} entries)`);
    processed += 1;
  } catch (err) {
    // Log the error with the full path and continue with remaining files
    console.error(`  ❌  Error en ${srcPath}`);
    console.error(`      ${err.message}`);
    errors += 1;
  }
}

console.log(`\n📊  Summary: ${processed} files processed, ${errors} errors.`);

if (errors > 0) {
  process.exit(1);
}

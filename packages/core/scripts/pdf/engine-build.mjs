// Build-time selection only: never include two engines or an automatic fallback.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = dirname(fileURLToPath(import.meta.url));
const sourceSha256 = 'a724e3209cbd94fb5295a45416169e58881b54806c4a34bedca85faa74d8f05c';
const formatter = `function formatPdfNumber(value) {
\tif (Number.isInteger(value)) return value.toString();
\tlet str = value.toFixed(5);
\tstr = str.replace(TRAILING_ZERO_REGEX, "");
\tif (str === "" || str === "-") return "0";
\treturn str;
}`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function enginePatchMetadata(engine) {
  if (engine !== 'libpdf-precision') return null;
  return { kind: 'ZU Tools build-time serializer replacement; not an upstream release',
    originalModuleSha256: sourceSha256, formatterSha256: sha(await readFile(join(root, 'exact-pdf-number.mjs'))) };
}
export function engineBuildOptions(engine = 'libpdf-precision') {
  if (!['libpdf', 'pdf-lib', 'libpdf-precision'].includes(engine)) throw new Error('Unknown PDF research engine');
  if (engine === 'libpdf-precision') return { plugins: [{
    name: 'zutools-libpdf-precision',
    setup(build) {
      let applied = false;
      build.onLoad({ filter: /\/node_modules\/@libpdf\/core\/dist\/index\.mjs$/ }, async args => {
        const contents = await readFile(args.path, 'utf8');
        if (sha(contents) !== sourceSha256 || contents.split(formatter).length !== 2) throw new Error('LibPDF source changed: precision patch requires review');
        const replacement = 'function formatPdfNumber(value) { return formatPdfNumberExact(value); }';
        applied = true;
        return { contents: `import { formatPdfNumberExact } from ${JSON.stringify(join(root, 'exact-pdf-number.mjs'))};\n` + contents.replace(formatter, replacement),
          loader: 'js', resolveDir: dirname(args.path) };
      });
      build.onEnd(result => {
        const containsEngine = Object.keys(result.metafile?.inputs || {}).some(path => /node_modules\/@libpdf\/core\//.test(path));
        if (containsEngine && !applied) return { errors: [{ text: 'LibPDF entry changed: precision replacement was not applied' }] };
      });
    },
  }] };
  throw new Error('Only the reviewed, precision-patched engine is distributable');
}

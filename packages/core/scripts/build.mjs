import { build } from 'esbuild';
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });

await build({
  entryPoints: {
    index: 'src/index.js',
    base64: 'src/base64.js',
    catalog: 'src/catalog.js',
    csv: 'src/csv.js',
    image: 'src/image.js',
    'image-metadata': 'src/image-metadata.js',
    json: 'src/json.js',
    text: 'src/text.js',
    timestamp: 'src/timestamp.js',
  },
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
});

await mkdir('dist/catalog', { recursive: true });
await copyFile('catalog/tools.json', 'dist/catalog/tools.json');

const sourceFiles = await readdir('src');
await Promise.all(
  sourceFiles
    .filter((filename) => filename.endsWith('.d.ts'))
    .map((filename) => copyFile(`src/${filename}`, `dist/${filename}`))
);

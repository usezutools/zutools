import { build } from 'esbuild';
import { rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });

await build({
  entryPoints: {
    index: 'tools/index.js',
    portal: 'tools/portal.js',
    catalog: 'tools/catalog.js',
    implementations: 'tools/implementations/index.js',
    'word-counter': 'tools/word-counter.js',
    'merge-pdf': 'tools/merge-pdf.js',
    'organize-pdf': 'tools/organize-pdf.js',
    'split-pdf': 'tools/split-pdf.js',
  },
  outdir: 'dist',
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: '[name]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  sourcemap: true,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'lucide-react',
    '@zutools/core',
    '@zutools/core/*',
  ],
});

// `portal` shares the complete UI with the root entry. Consumers use the single
// exported stylesheet, so keeping a duplicate extracted CSS file only inflates
// the npm tarball.
await Promise.all([
  rm('dist/portal.css', { force: true }),
  rm('dist/portal.css.map', { force: true }),
]);

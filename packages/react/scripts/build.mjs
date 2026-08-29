import { build } from 'esbuild';
import { rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });

await build({
  entryPoints: {
    index: 'tools/index.js',
    free: 'tools/free.js',
    catalog: 'tools/catalog.js',
    implementations: 'tools/implementations/index.js',
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

// `free` shares the complete UI with the root entry. Consumers use the single
// exported stylesheet, so keeping a duplicate extracted CSS file only inflates
// the npm tarball.
await Promise.all([
  rm('dist/free.css', { force: true }),
  rm('dist/free.css.map', { force: true }),
]);

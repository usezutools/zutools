import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('../..', import.meta.url));
const reactTools = fileURLToPath(new URL('../../packages/react/tools', import.meta.url));
const implementation = fileURLToPath(new URL('../../packages/react/tools/implementations', import.meta.url));
const coreSource = fileURLToPath(new URL('../../packages/core/src', import.meta.url));

// Production builds deliberately use the installed tarballs. During `vite`
// development we resolve the React package to its source files so edits receive
// Vite HMR without rebuilding or reinstalling the example.
export default defineConfig(({ command }) => ({
  resolve: command === 'serve' ? {
    alias: [
      { find: '@zutools/core/text-diff', replacement: `${coreSource}/text-diff.js` },
      { find: '@zutools/react/merge-pdf.css', replacement: `${implementation}/PdfTools.css` },
      { find: '@zutools/react/organize-pdf.css', replacement: `${implementation}/PdfTools.css` },
      { find: '@zutools/react/split-pdf.css', replacement: `${implementation}/PdfTools.css` },
      { find: '@zutools/react/word-counter.css', replacement: `${implementation}/WordCounter.css` },
      { find: '@zutools/react/text-diff-checker.css', replacement: `${implementation}/TextDiffChecker.css` },
      { find: '@zutools/react/styles.css', replacement: `${reactTools}/tools.css` },
      { find: '@zutools/react', replacement: reactTools },
    ],
  } : undefined,
  server: {
    fs: { allow: [root] },
  },
}));

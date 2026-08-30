import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const approvedPdfTools = ['merge-pdf', 'organize-pdf', 'split-pdf'];
const reservedEditionPattern = new RegExp(`\\b${['l', 'i', 't', 'e'].join('')}\\b`, 'i');
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'artifacts', 'test-results', 'playwright-report']);
const textExtensions = new Set(['.css', '.d.ts', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.ts']);
const publicRoots = [
  'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'RELEASING.md', 'SECURITY.md',
  'examples', 'packages', 'tests',
];

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const target = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await collect(target));
    else if (textExtensions.has(extname(entry.name)) || entry.name.endsWith('.d.ts')) files.push(target);
  }
  return files;
}

const files = [];
for (const entry of publicRoots) {
  const path = join(root, entry);
  if (extname(entry)) files.push(path);
  else files.push(...await collect(path));
}

const leaks = [];
for (const path of files) {
  const text = await readFile(path, 'utf8');
  const match = reservedEditionPattern.exec(text);
  if (match) {
    const line = text.slice(0, match.index).split('\n').length;
    leaks.push(`${relative(root, path)}:${line}`);
  }
}
assert.deepEqual(leaks, [], `Reserved edition references found in public files:\n${leaks.join('\n')}`);

const catalog = JSON.parse(await readFile(join(root, 'packages/core/catalog/tools.json'), 'utf8'));
const catalogPdfTools = catalog.tools.filter(tool => tool.category === 'pdf').map(tool => tool.id).sort();
assert.deepEqual(catalogPdfTools, [...approvedPdfTools].sort(), 'Only approved PDF tools may enter the public catalogue');

const { tools } = await import('../packages/core/src/pdf/contract.js');
assert.deepEqual(tools.map(tool => tool.id).sort(), [...approvedPdfTools].sort(), 'Only approved PDF tools may enter the public Core contract');
assert.ok(tools.every(tool => Object.keys(tool).sort().join(',') === 'edition,id,name'), 'Public PDF descriptors must not expose future-edition fields');

console.log(`Public boundary valid: ${approvedPdfTools.length} approved PDF tools and no reserved edition references.`);

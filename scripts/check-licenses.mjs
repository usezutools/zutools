import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const lockfile = JSON.parse(
  await readFile(join(workspaceRoot, 'package-lock.json'), 'utf8')
);
const allowedLicenses = new Set(['Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MIT']);
const reviewed = JSON.parse(await readFile(join(workspaceRoot, 'scripts/pdf-license-review.json'), 'utf8')).packages;
const errors = [];
const licenseCounts = new Map();

for (const [packagePath, metadata] of Object.entries(lockfile.packages || {})) {
  if (!packagePath || metadata.link) continue;
  const packageName = packagePath.replace(/^node_modules\//, '');
  const license = metadata.license;

  if (!license) {
    errors.push(`${packageName}@${metadata.version || 'unknown'} has no declared license`);
    continue;
  }
  const exception = reviewed.find(item => item.package === packagePath.split('node_modules/').at(-1) && item.version === metadata.version && item.license === license);
  let verifiedException = false;
  if (exception) {
    verifiedException = true;
    for (const [file, hash] of Object.entries(exception.files)) {
      const actual = createHash('sha256').update(await readFile(join(workspaceRoot, packagePath, file))).digest('hex');
      if (actual !== hash) verifiedException = false;
    }
  }
  if (!allowedLicenses.has(license) && !verifiedException) {
    errors.push(`${packageName}@${metadata.version || 'unknown'} uses ${license}`);
    continue;
  }

  licenseCounts.set(license, (licenseCounts.get(license) || 0) + 1);
}

assert.equal(
  errors.length,
  0,
  `Dependency license review required:\n${errors.join('\n')}`
);

console.table(
  [...licenseCounts.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([license, packages]) => ({ license, packages }))
);
console.log('All dependency licenses match the approved list or a pinned, notice-verified review.');

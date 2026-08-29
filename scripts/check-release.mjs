import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const publishMode = process.argv.includes('--publish');
const expectedVersion = process.argv.slice(2).find((argument) => !argument.startsWith('--'));

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(workspaceRoot, relativePath), 'utf8'));
}

const rootPackage = await readJson('package.json');
const corePackage = await readJson('packages/core/package.json');
const reactPackage = await readJson('packages/react/package.json');
const changelog = await readFile(join(workspaceRoot, 'CHANGELOG.md'), 'utf8');
const packages = [corePackage, reactPackage];

assert.match(rootPackage.version, /^\d+\.\d+\.\d+$/, 'Workspace version must use stable SemVer');
assert.equal(corePackage.version, rootPackage.version, 'Core version must match the workspace');
assert.equal(reactPackage.version, rootPackage.version, 'React version must match the workspace');
assert.equal(
  reactPackage.dependencies['@zutools/core'],
  corePackage.version,
  'React must depend on the Core version being released'
);
if (expectedVersion) {
  assert.equal(rootPackage.version, expectedVersion, 'Requested release version does not match package.json');
}
const changelogHeading = changelog.match(
  new RegExp(
    `^## \\[${rootPackage.version.replaceAll('.', '\\.')}\\] - (.+)$`,
    'm'
  )
);
assert.ok(changelogHeading, `CHANGELOG.md must contain a ${rootPackage.version} section`);
if (publishMode) {
  assert.match(
    changelogHeading[1],
    /^\d{4}-\d{2}-\d{2}$/,
    'The changelog release must have an ISO date before publication'
  );
}

for (const packageJson of packages) {
  assert.equal(packageJson.private, undefined, `${packageJson.name} must be publishable`);
  assert.equal(packageJson.license, 'MIT', `${packageJson.name} must declare MIT`);
  assert.equal(packageJson.publishConfig?.access, 'public', `${packageJson.name} must publish publicly`);
  assert.equal(
    packageJson.publishConfig?.registry,
    'https://registry.npmjs.org/',
    `${packageJson.name} must publish only to npmjs.org`
  );
  assert.equal(
    packageJson.repository?.url,
    'git+https://github.com/usezutools/zutools.git',
    `${packageJson.name} must point provenance at the public repository`
  );
  assert.ok(packageJson.description, `${packageJson.name} needs a description`);
  assert.ok(packageJson.homepage, `${packageJson.name} needs a homepage`);
  assert.ok(packageJson.bugs?.url, `${packageJson.name} needs an issue tracker`);
  assert.ok(packageJson.keywords?.length >= 5, `${packageJson.name} needs discovery keywords`);

  for (const [entry, conditions] of Object.entries(packageJson.exports || {})) {
    const targets = typeof conditions === 'string' ? [conditions] : Object.values(conditions);
    assert.ok(
      targets.every((target) => target.startsWith('./dist/')),
      `${packageJson.name} export ${entry} must point exclusively to dist/`
    );
  }
}

console.log(`Release contract valid for ZU Tools ${rootPackage.version}.`);

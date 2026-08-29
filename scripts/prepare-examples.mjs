import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const artifactsDir = join(workspaceRoot, 'artifacts');
const npmCacheDir = join(artifactsDir, 'npm-cache');
const examples = ['vanilla', 'react'];

function run(command, args, cwd = workspaceRoot) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, npm_config_cache: npmCacheDir },
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
  }
}

async function packageVersion(packageDirectory) {
  const packageJson = JSON.parse(
    await readFile(join(workspaceRoot, packageDirectory, 'package.json'), 'utf8')
  );
  return packageJson.version;
}

async function packPackage(packageDirectory, tarballPrefix, stableName) {
  const version = await packageVersion(packageDirectory);
  run('npm', [
    'pack',
    join(workspaceRoot, packageDirectory),
    '--ignore-scripts',
    '--pack-destination',
    artifactsDir,
  ]);

  const generatedTarball = join(artifactsDir, `${tarballPrefix}-${version}.tgz`);
  if (!existsSync(generatedTarball)) {
    throw new Error(`Expected tarball was not generated: ${generatedTarball}`);
  }
  await rename(generatedTarball, join(artifactsDir, stableName));
}

await rm(artifactsDir, { recursive: true, force: true });
await mkdir(artifactsDir, { recursive: true });

await packPackage('packages/core', 'zutools-core', 'zutools-core.tgz');
await packPackage('packages/react', 'zutools-react', 'zutools-react.tgz');

for (const example of examples) {
  const exampleDirectory = join(workspaceRoot, 'examples', example);
  await rm(join(exampleDirectory, 'node_modules'), {
    recursive: true,
    force: true,
  });
  await rm(join(exampleDirectory, 'dist'), { recursive: true, force: true });
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-package-lock'],
    exampleDirectory
  );
}

console.log('Runnable examples now consume fresh ZU Tools tarballs.');

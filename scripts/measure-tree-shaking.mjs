import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), 'zutools-tree-shaking-'));
const artifactsDir = join(temporaryRoot, 'artifacts');
const consumerDir = join(temporaryRoot, 'consumer');
const coreTarball = join(artifactsDir, 'zutools-core-0.1.0.tgz');
const reactTarball = join(artifactsDir, 'zutools-react-0.1.0.tgz');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_cache: join(temporaryRoot, 'npm-cache'),
    },
  });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
  }
}

async function measure(entryPoint, external = []) {
  const result = await build({
    absWorkingDir: consumerDir,
    entryPoints: [entryPoint],
    outdir: join(temporaryRoot, 'output'),
    bundle: true,
    write: false,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    external,
  });

  return result.outputFiles.reduce(
    (totals, file) => {
      const kind = file.path.endsWith('.css') ? 'css' : 'javascript';
      totals[kind].bytes += file.contents.byteLength;
      totals[kind].gzipBytes += gzipSync(file.contents).byteLength;
      return totals;
    },
    {
      javascript: { bytes: 0, gzipBytes: 0 },
      css: { bytes: 0, gzipBytes: 0 },
    }
  );
}

try {
  await mkdir(artifactsDir, { recursive: true });
  await mkdir(consumerDir, { recursive: true });

  run(
    'npm',
    [
      'pack',
      join(workspaceRoot, 'packages/core'),
      '--ignore-scripts',
      '--pack-destination',
      artifactsDir,
    ],
    workspaceRoot
  );
  run(
    'npm',
    [
      'pack',
      join(workspaceRoot, 'packages/react'),
      '--ignore-scripts',
      '--pack-destination',
      artifactsDir,
    ],
    workspaceRoot
  );
  assert.ok(existsSync(coreTarball));
  assert.ok(existsSync(reactTarball));

  await writeFile(
    join(consumerDir, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`
  );
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-package-lock',
      '--legacy-peer-deps',
      coreTarball,
      reactTarball,
    ],
    consumerDir
  );

  await writeFile(
    join(consumerDir, 'core-word-counter.js'),
    `import { analyzeText } from '@zutools/core/word-counter';\nconsole.log(analyzeText('Hello world'));\n`
  );
  await writeFile(
    join(consumerDir, 'react-word-counter.js'),
    `import '@zutools/react/word-counter.css';\nimport { WordCounter } from '@zutools/react/word-counter';\nconsole.log(WordCounter);\n`
  );
  await writeFile(
    join(consumerDir, 'react-free.js'),
    `import '@zutools/react/styles.css';\nimport { ToolsPortal } from '@zutools/react/free';\nconsole.log(ToolsPortal);\n`
  );

  const reactExternals = [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'lucide-react',
    '@zutools/core',
    '@zutools/core/*',
  ];
  const report = {
    coreWordCounter: await measure('core-word-counter.js'),
    reactWordCounter: await measure('react-word-counter.js', reactExternals),
    reactFreePortal: await measure('react-free.js', reactExternals),
  };

  assert.ok(
    report.reactWordCounter.javascript.gzipBytes <
      report.reactFreePortal.javascript.gzipBytes,
    'The individual React export must be smaller than the complete Free portal'
  );
  assert.ok(
    report.reactWordCounter.css.gzipBytes < report.reactFreePortal.css.gzipBytes,
    'The individual tool CSS must be smaller than the complete portal CSS'
  );

  console.table(
    Object.entries(report).map(([entry, metrics]) => ({
      entry,
      jsBytes: metrics.javascript.bytes,
      jsGzipBytes: metrics.javascript.gzipBytes,
      cssBytes: metrics.css.bytes,
      cssGzipBytes: metrics.css.gzipBytes,
    }))
  );

  if (process.argv.includes('--write')) {
    const reportPath = join(workspaceRoot, 'benchmarks/tree-shaking.json');
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

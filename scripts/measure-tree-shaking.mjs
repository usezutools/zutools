import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
const workspacePackage = JSON.parse(await readFile(join(workspaceRoot, 'package.json'), 'utf8'));
const coreTarball = join(artifactsDir, `zutools-core-${workspacePackage.version}.tgz`);
const reactTarball = join(artifactsDir, `zutools-react-${workspacePackage.version}.tgz`);
const reportPath = join(workspaceRoot, 'benchmarks/tree-shaking.json');
const allowedGrowthRatio = 0.05;
const allowedGrowthBytes = 64;

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

function checkAgainstBaseline(report, baseline) {
  const regressions = [];

  for (const [entry, metrics] of Object.entries(report)) {
    for (const kind of ['javascript', 'css']) {
      const currentBytes = metrics[kind].gzipBytes;
      const baselineBytes = baseline[entry]?.[kind]?.gzipBytes;
      if (typeof baselineBytes !== 'number') {
        regressions.push(`${entry}.${kind}: missing from the committed baseline`);
        continue;
      }
      if (baselineBytes === 0 && currentBytes === 0) continue;

      const limit = Math.ceil(
        baselineBytes * (1 + allowedGrowthRatio) + allowedGrowthBytes
      );
      if (currentBytes > limit) {
        regressions.push(
          `${entry}.${kind}: ${currentBytes} gzip bytes exceeds the ${limit}-byte limit ` +
            `(baseline: ${baselineBytes})`
        );
      }
    }
  }

  assert.equal(
    regressions.length,
    0,
    `Bundle-size regression detected:\n${regressions.join('\n')}\n` +
      'If the increase is intentional, review it and run npm run measure:tree-shaking:update.'
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
    join(consumerDir, 'react-portal.js'),
    `import '@zutools/react/styles.css';\nimport { ToolsPortal } from '@zutools/react/portal';\nconsole.log(ToolsPortal);\n`
  );
  await writeFile(
    join(consumerDir, 'core-pdf.js'),
    `import { createPdfToolsClient } from '@zutools/core/pdf';\nconsole.log(createPdfToolsClient);\n`
  );
  await writeFile(
    join(consumerDir, 'core-text-diff.js'),
    `import { compareText } from '@zutools/core/text-diff';\nconsole.log(compareText('before', 'after'));\n`
  );
  await writeFile(
    join(consumerDir, 'react-text-diff-checker.js'),
    `import '@zutools/react/text-diff-checker.css';\nimport { TextDiffChecker } from '@zutools/react/text-diff-checker';\nconsole.log(TextDiffChecker);\n`
  );
  for (const tool of ['merge-pdf', 'organize-pdf', 'split-pdf']) {
    await writeFile(
      join(consumerDir, `react-${tool}.js`),
      `import '@zutools/react/${tool}.css';\nimport * as tool from '@zutools/react/${tool}';\nconsole.log(tool);\n`
    );
  }

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
    corePdfClient: await measure('core-pdf.js'),
    coreTextDiff: await measure('core-text-diff.js'),
    reactWordCounter: await measure('react-word-counter.js', reactExternals),
    reactTextDiffChecker: await measure('react-text-diff-checker.js', reactExternals),
    reactMergePdf: await measure('react-merge-pdf.js', reactExternals),
    reactOrganizePdf: await measure('react-organize-pdf.js', reactExternals),
    reactSplitPdf: await measure('react-split-pdf.js', reactExternals),
    reactPortal: await measure('react-portal.js', reactExternals),
  };

  assert.ok(
    report.reactWordCounter.javascript.gzipBytes <
      report.reactPortal.javascript.gzipBytes,
    'The individual React export must be smaller than the complete portal'
  );
  assert.ok(
    report.reactWordCounter.css.gzipBytes < report.reactPortal.css.gzipBytes,
    'The individual tool CSS must be smaller than the complete portal CSS'
  );
  assert.ok(
    report.reactTextDiffChecker.javascript.gzipBytes < report.reactPortal.javascript.gzipBytes,
    'The text diff React export must be smaller than the complete portal'
  );
  assert.ok(
    report.reactTextDiffChecker.css.gzipBytes < report.reactPortal.css.gzipBytes,
    'The text diff React CSS must be smaller than the complete portal CSS'
  );
  for (const entry of ['reactMergePdf', 'reactOrganizePdf', 'reactSplitPdf']) {
    assert.ok(
      report[entry].javascript.gzipBytes < report.reactPortal.javascript.gzipBytes,
      `${entry} JavaScript must be smaller than the complete portal`
    );
    assert.ok(
      report[entry].css.gzipBytes < report.reactPortal.css.gzipBytes,
      `${entry} CSS must be smaller than the complete portal`
    );
  }

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
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log('Tree-shaking baseline updated.');
  } else if (process.argv.includes('--check')) {
    const baseline = JSON.parse(await readFile(reportPath, 'utf8'));
    checkAgainstBaseline(report, baseline);
    console.log('Tree-shaking measurements are within the committed limits.');
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

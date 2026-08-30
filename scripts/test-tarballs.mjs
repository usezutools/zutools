import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), 'zutools-consumers-'));
const artifactsDir = join(temporaryRoot, 'artifacts');
const npmCacheDir = join(temporaryRoot, 'npm-cache');
const coreTarball = join(artifactsDir, 'zutools-core-0.1.0.tgz');
const reactTarball = join(artifactsDir, 'zutools-react-0.1.0.tgz');

function run(command, args, cwd) {
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

async function createProject(path, files) {
  await mkdir(path, { recursive: true });
  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const destination = join(path, relativePath);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, contents);
    })
  );
}

try {
  await mkdir(artifactsDir, { recursive: true });
  run(
    'npm',
    ['pack', join(workspaceRoot, 'packages/core'), '--pack-destination', artifactsDir],
    workspaceRoot
  );
  run(
    'npm',
    ['pack', join(workspaceRoot, 'packages/react'), '--pack-destination', artifactsDir],
    workspaceRoot
  );

  assert.ok(existsSync(coreTarball), 'Core tarball was not created');
  assert.ok(existsSync(reactTarball), 'React tarball was not created');

  const vanillaProject = join(temporaryRoot, 'vanilla-consumer');
  await createProject(vanillaProject, {
    'package.json': `${JSON.stringify(
      {
        name: 'zutools-vanilla-consumer',
        private: true,
        type: 'module',
        dependencies: { '@zutools/core': `file:${coreTarball}` },
      },
      null,
      2
    )}\n`,
    'index.mjs': `
      import assert from 'node:assert/strict';
      import { utf8ToBase64 } from '@zutools/core/base64';
      import { csvToObjects } from '@zutools/core/csv';
      import { formatJson } from '@zutools/core/json';
      import { toolsCatalog } from '@zutools/core/catalog';
      import { analyzeText } from '@zutools/core/word-counter';
      import { createPdfToolsClient, parsePdfRanges } from '@zutools/core/pdf';
      import { existsSync } from 'node:fs';
      import { fileURLToPath } from 'node:url';
      import catalogJson from '@zutools/core/catalog.json' with { type: 'json' };

      assert.equal(utf8ToBase64('ZU Tools'), 'WlUgVG9vbHM=');
      assert.deepEqual(csvToObjects('name,value\\nalpha,1'), [{ name: 'alpha', value: '1' }]);
      assert.equal(formatJson('{"ready":true}'), '{\\n  "ready": true\\n}');
      assert.equal(analyzeText('Hello brave world.').words, 3);
      assert.equal(toolsCatalog.tools.length, 14);
      assert.deepEqual(parsePdfRanges('1; 2-3', 3), [[0], [1,2]]);
      assert.equal(typeof createPdfToolsClient, 'function');
      for (const name of ['pdf.worker.js','pdfjs.worker.js','pdf-preview','pdf-build.json']) assert.ok(existsSync(fileURLToPath(import.meta.resolve('@zutools/core/'+name))));
      assert.equal(catalogJson.tools.length, toolsCatalog.tools.length);
      console.log('Vanilla consumer passed');
    `,
  });
  run('npm', ['install', '--ignore-scripts', '--no-package-lock'], vanillaProject);
  run('node', ['index.mjs'], vanillaProject);

  const reactProject = join(temporaryRoot, 'react-consumer');
  await createProject(reactProject, {
    'package.json': `${JSON.stringify(
      {
        name: 'zutools-react-consumer',
        private: true,
        type: 'module',
        dependencies: {
          '@zutools/core': `file:${coreTarball}`,
          '@zutools/react': `file:${reactTarball}`,
          '@types/react': '18.3.31',
          '@types/react-dom': '18.3.7',
          'lucide-react': '0.468.0',
          react: '18.3.1',
          'react-dom': '18.3.1',
        },
      },
      null,
      2
    )}\n`,
    'render.mjs': `
      import assert from 'node:assert/strict';
      import { existsSync } from 'node:fs';
      import { fileURLToPath } from 'node:url';
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import ToolsPortal, { portalCatalog, portalRegistry } from '@zutools/react/portal';
      import { WordCounter } from '@zutools/react/word-counter';
      import { MergePdf } from '@zutools/react/merge-pdf';
      import { OrganizePdf } from '@zutools/react/organize-pdf';
      import { SplitPdf } from '@zutools/react/split-pdf';

      const markup = renderToStaticMarkup(
        React.createElement(ToolsPortal, {
          catalog: portalCatalog,
          registry: portalRegistry,
          language: 'en',
        })
      );
      assert.match(markup, /ZU Tools/);
      assert.match(renderToStaticMarkup(React.createElement(WordCounter)), /textarea/);
      for (const Component of [MergePdf, OrganizePdf, SplitPdf]) assert.match(renderToStaticMarkup(React.createElement(Component)), /application/);
      for (const name of ['merge-pdf','organize-pdf','split-pdf']) assert.ok(existsSync(fileURLToPath(import.meta.resolve('@zutools/react/'+name+'.css'))));
      assert.ok(existsSync(fileURLToPath(import.meta.resolve('@zutools/react/styles.css'))));
      assert.ok(existsSync(fileURLToPath(import.meta.resolve('@zutools/react/workspace.css'))));
      assert.ok(existsSync(fileURLToPath(import.meta.resolve('@zutools/react/word-counter.css'))));
      console.log('React runtime consumer passed');
    `,
    'consumer.tsx': `
      import React from 'react';
      import ToolsPortal, {
        portalCatalog,
        portalRegistry,
      } from '@zutools/react/portal';
      import { WordCounter } from '@zutools/react/word-counter';
      import { MergePdf } from '@zutools/react/merge-pdf';
      import { OrganizePdf } from '@zutools/react/organize-pdf';
      import { SplitPdf } from '@zutools/react/split-pdf';
      import { createPdfToolsClient, type PdfResult } from '@zutools/core/pdf';
      import '@zutools/react/styles.css';
      import '@zutools/react/word-counter.css';

      export const view = (
        <ToolsPortal
          language="en"
          catalog={portalCatalog}
          registry={portalRegistry}
        />
      );

      export const isolatedTool = <WordCounter language="es" />;
      export const pdfTools = [<MergePdf language="es" />, <OrganizePdf />, <SplitPdf />];
      export const pdfApi = createPdfToolsClient;
      export type Result = PdfResult;
    `,
    'tsconfig.json': `${JSON.stringify(
      {
        compilerOptions: {
          jsx: 'react-jsx',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2020',
        },
        include: ['consumer.tsx'],
      },
      null,
      2
    )}\n`,
  });
  run('npm', ['install', '--ignore-scripts', '--no-package-lock'], reactProject);
  run('node', ['render.mjs'], reactProject);
  run(join(workspaceRoot, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], reactProject);

  console.log('Tarball consumer smoke tests passed');
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

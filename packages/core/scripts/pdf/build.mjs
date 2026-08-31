import { build } from 'esbuild';
import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { engineBuildOptions, enginePatchMetadata } from './engine-build.mjs';

export async function buildPdf() {
  const root = resolve('../..'), pdfjs = join(root, 'node_modules/pdfjs-dist'), assets = [];
  // Do not redistribute Liberation's GPL+exception fonts or the unused JS engine.
  for (const [folder, kind, pattern] of [['cmaps','cMapUrl',/\.bcmap$/],['standard_fonts','standardFontDataUrl',/\.pfb$/],['wasm','wasmUrl',/^(openjpeg|jbig2|qcms_bg)\.wasm$/]]) {
    for (const file of await readdir(join(pdfjs, folder))) if (pattern.test(file)) assets.push({ file, kind, path: join(pdfjs, folder, file) });
  }
  const assetPlugin = { name: 'local-pdf-assets', setup(builder) {
    builder.onResolve({ filter: /^zutools:pdf-assets$/ }, () => ({ path: 'assets', namespace: 'local-pdf' }));
    builder.onLoad({ filter: /.*/, namespace: 'local-pdf' }, () => ({ loader: 'js', resolveDir: root,
      contents: `const assets={${assets.map(a => `${JSON.stringify(a.kind+':'+a.file)}:()=>import(${JSON.stringify(a.path)})`).join(',')}};
        export class LocalPdfAssets { async fetch({kind,filename}) { const load=assets[kind+':'+filename]; if(!load) throw new Error('Unsupported local PDF asset'); return (await load()).default.slice(); } }` }));
  } };
  const renderer = await build({ entryPoints: { 'pdf-preview': 'src/pdf-preview.js' }, bundle: true, splitting: true,
    outdir: 'dist', chunkNames: 'pdf-assets/[name]-[hash]', format: 'esm', platform: 'browser', target: 'es2022',
    minify: true, metafile: true, legalComments: 'eof', plugins: [assetPlugin], loader: { '.bcmap':'binary','.pfb':'binary','.wasm':'binary' },
  });
  const engine = await build({ entryPoints: ['src/pdf/worker.js'], outfile:'dist/pdf.worker.js', bundle:true,
    minify:true, format:'esm', platform:'browser', target:'es2022', metafile:true, legalComments:'eof', ...engineBuildOptions('libpdf-precision') });
  await copyFile(join(pdfjs,'build/pdf.worker.min.mjs'), 'dist/pdfjs.worker.js');
  await mkdir('dist/licenses', {recursive:true});
  // Keep full notices for all bundled packages, plus licenses for auxiliary assets.
  const packageRoots = new Set([pdfjs]);
  for (const file of [...Object.keys(engine.metafile.inputs), ...Object.keys(renderer.metafile.inputs)]) {
    if (!file.includes('node_modules/')) continue;
    let dir = dirname(resolve(file));
    while (dir.includes('node_modules')) {
      try {
        const pkg = JSON.parse(await readFile(join(dir,'package.json')));
        if (pkg.name) { packageRoots.add(dir); break; }
      } catch { /* keep looking for the package root */ }
      dir = dirname(dir);
    }
  }
  const notices = [];
  for (const dir of packageRoots) {
    const pkg=JSON.parse(await readFile(join(dir,'package.json')));
    const files=(await readdir(dir)).filter(f=>/^(license|copying|notice)(\.|$)/i.test(f));
    if(!files.length) throw new Error(`Missing bundled license: ${pkg.name}`);
    notices.push(`## ${pkg.name}@${pkg.version} (${pkg.license})`);
    for(const file of files) notices.push(await readFile(join(dir,file),'utf8'));
    if(pkg.name==='pako') {
      const source=await readFile(join(dir,'lib/zlib/deflate.js'),'utf8');
      const notice=source.match(/\/\*[\s\S]*?\*\//);
      if(!notice) throw new Error('Missing pako zlib notice');
      notices.push(notice[0]);
    }
  }
  for(const folder of ['cmaps','standard_fonts','wasm']) for(const file of await readdir(join(pdfjs,folder))) {
    if(!/^LICENSE/.test(file) || file==='LICENSE_LIBERATION') continue;
    notices.push(`## PDF.js ${folder}/${file}`, await readFile(join(pdfjs,folder,file),'utf8'));
  }
  await writeFile('dist/licenses/PDF-NOTICES.txt', notices.join('\n\n'));
  const metrics=[];
  for(const name of ['pdf.js','pdf.worker.js','pdf-preview.js','pdfjs.worker.js']) {
    const bytes=await readFile(join('dist',name)); metrics.push({name,bytes:bytes.length,gzip:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  await writeFile('dist/pdf-build.json',JSON.stringify({engine:'@libpdf/core@0.4.1 with ZU Tools precision patch',patch:await enginePatchMetadata('libpdf-precision'),metrics,assetCount:assets.length,excludedAssets:['Liberation fonts (GPL+exception)','QuickJS (unused)']},null,2)+'\n');
}

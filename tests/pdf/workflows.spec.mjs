import { test, expect } from '@playwright/test';
import { PDFDocument, PDFName } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { makePdf } from '../../packages/core/test/pdf-fixtures.mjs';
const fixture = async (name, options={}) => ({name:name+'.pdf',mimeType:'application/pdf',buffer:Buffer.from(await makePdf(options))});
async function download(page, name) {
  const promise=page.waitForEvent('download');await page.getByRole('button',{name,exact:false}).click();
  const event=await promise,stream=await event.createReadStream(),chunks=[];for await(const c of stream) chunks.push(c);return Buffer.concat(chunks);
}
async function open(page, mode) {
  await page.goto('/');await page.getByRole('button',{name:'PDF',exact:true}).click();
  await page.getByRole('button',{name:'ES',exact:true}).click();
  await page.getByRole('navigation',{name:'PDF tools'}).getByRole('button',{name:mode,exact:true}).click();
}
test.beforeEach(async({page})=>{
  // All network resources must be local assets. No document upload or third-party request.
  await page.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.protocol==='http:' && url.hostname==='127.0.0.1' && request.method()==='GET') return route.continue();
    if(['data:','blob:'].includes(url.protocol)) return route.continue();
    throw new Error('Unexpected network request: '+request.method()+' '+request.url());
  });
});
test('merge: packaged workers, thumbnails, reorder, blank metadata and download',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page,'Unir PDF');await expect(page.locator('.zu-pdf-tool')).toBeVisible();
  await expect(page.locator('.zu-pdf-notice')).toHaveCount(0);
  await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles([await fixture('first'),await fixture('second',{title:'Other'})]);
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(2);
  await expect(page.locator('.zu-pdf-thumb img')).toHaveCount(2);
  await page.getByRole('button',{name:'Subir second.pdf',exact:true}).click();
  await expect(page.locator('.zu-pdf-file-info strong').first()).toHaveText('second.pdf');
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Unir PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const pdf=await PDFDocument.load(await download(page,'Descargar merge-pdf.pdf'),{updateMetadata:false});
  expect(pdf.getPageCount()).toBe(6);expect(pdf.getTitle()).toBeUndefined();expect(pdf.getAuthor()).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);await page.screenshot({path:testInfo.outputPath('merge.png'),fullPage:true});
});
test('dangling optional outline root is left to LibPDF without adapter filtering',async({page})=>{
  await open(page,'Unir PDF');
  await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('dangling-outline',{danglingCatalog:'Outlines'}));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(1);
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Unir PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const pdf=await PDFDocument.load(await download(page,'Descargar merge-pdf.pdf'),{updateMetadata:false});
  expect(pdf.getPageCount()).toBe(3);expect(pdf.catalog.has(PDFName.of('Outlines'))).toBe(true);
});
test('organize: previews, reverse, exclude, rotate, duplicate and native extraction metadata',async({page},testInfo)=>{
  await open(page,'Organizar PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('source'));
  await expect(page.locator('.zu-pdf-thumb img')).toHaveCount(3);
  await page.getByRole('button',{name:'Invertir orden',exact:true}).click();
  await page.getByRole('button',{name:'Girar 90° · 1',exact:true}).click();
  await page.getByRole('button',{name:'Duplicar · 1',exact:true}).click();
  await page.getByRole('checkbox',{name:'Página 1',exact:true}).uncheck();
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Organizar PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const pdf=await PDFDocument.load(await download(page,'Descargar organize-pdf.pdf'),{updateMetadata:false});
  expect(pdf.getTitle()).toBe('Untitled');expect(pdf.getPageCount()).toBe(3);expect(pdf.getPages().map(p=>p.getRotation().angle)).toEqual([90,90,0]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('organize.png'),fullPage:true});
});
test('split: invalid ranges, independent output and ZIP',async({page},testInfo)=>{
  await open(page,'Dividir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('source'));
  await expect(page.locator('.zu-pdf-thumb img')).toHaveCount(3);
  await page.getByRole('textbox',{name:'Rangos de salida'}).fill('0');
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Dividir PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Revisa');
  await page.getByRole('textbox',{name:'Rangos de salida'}).fill('1,3; 2');
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Dividir PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const entries=unzipSync(await download(page,'Descargar todo en ZIP'));
  expect(Object.keys(entries)).toEqual(['part-1.pdf','part-2.pdf']);
  expect((await PDFDocument.load(entries['part-1.pdf'])).getPageCount()).toBe(2);
  expect(Buffer.from(entries['part-2.pdf'])).toEqual(await download(page,'Descargar part-2.pdf'));
  await page.screenshot({path:testInfo.outputPath('split.png'),fullPage:true});
});
test('a tagged PDF is preserved by a native whole-document merge',async({page})=>{
  await open(page,'Unir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('tagged',{feature:'tagged'}));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(1);
  await expect(page.getByText('Este PDF contiene etiquetas de accesibilidad')).toHaveCount(0);
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Unir PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const pdf=await PDFDocument.load(await download(page,'Descargar merge-pdf.pdf'),{updateMetadata:false});
  expect(pdf.catalog.has(PDFName.of('MarkInfo'))).toBe(true);expect(pdf.catalog.has(PDFName.of('StructTreeRoot'))).toBe(true);
  expect(pdf.getPages()[0].node.has(PDFName.of('StructParents'))).toBe(true);
});
test('tagged page extraction requires consent and uses LibPDF native omission',async({page})=>{
  await open(page,'Dividir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('tagged',{feature:'tagged'}));
  await page.getByRole('textbox',{name:'Rangos de salida'}).fill('1; 2-3');
  await expect(page.getByText('Este PDF contiene etiquetas de accesibilidad')).toBeVisible();
  await expect(page.locator('.zu-pdf-actions').getByRole('button',{name:'Dividir PDF',exact:true})).toBeDisabled();
  await page.getByRole('checkbox',{name:'Entiendo y autorizo retirar las etiquetas de accesibilidad de la copia',exact:true}).check();
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Dividir PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  await expect(page.getByText('La copia se ha generado sin las etiquetas de accesibilidad')).toBeVisible();
  const pdf=await PDFDocument.load(await download(page,'Descargar part-1.pdf'),{updateMetadata:false});
  expect(pdf.catalog.has(PDFName.of('StructTreeRoot'))).toBe(false);expect(pdf.getPages()[0].node.has(PDFName.of('StructParents'))).toBe(false);
});
test('signed PDF is explained; next valid selection recovers',async({page})=>{
  await open(page,'Unir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('signed',{feature:'signature'}));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(1);
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Unir PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('estructura que todavía no podemos conservar');
  await expect(page.locator('.zu-pdf-results')).toHaveCount(0);
  await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('good'));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(1);
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Unir PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  await page.getByRole('button',{name:'Limpiar',exact:true}).click();await expect(page.locator('.zu-pdf-results')).toHaveCount(0);
});

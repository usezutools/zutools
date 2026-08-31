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
  await expect(page.getByRole('heading',{name:'Unir PDF',exact:true})).toBeVisible();
  await expect(page.getByText('Combina varios PDF en el orden que elijas.')).toBeVisible();
  await expect(page.getByText('Privado en tu equipo')).toBeVisible();
  await expect(page.getByText(/LibPDF|Compatibilidad|16 MiB|50 archivos/i)).toHaveCount(0);
  const drop=page.locator('.zu-pdf-drop');
  await drop.evaluate(element=>{const dataTransfer=new DataTransfer();dataTransfer.items.add(new File(['pdf'],'drag.pdf',{type:'application/pdf'}));element.dispatchEvent(new DragEvent('dragenter',{bubbles:true,dataTransfer}));});
  await expect(drop).toHaveClass(/is-active/);await expect(drop).toContainText('Suelta los PDF para añadirlos');
  await drop.evaluate(element=>{const dataTransfer=new DataTransfer();dataTransfer.items.add(new File(['pdf'],'drag.pdf',{type:'application/pdf'}));element.dispatchEvent(new DragEvent('dragleave',{bubbles:true,dataTransfer}));});
  await expect(drop).not.toHaveClass(/is-active/);
  const sample=await fixture('limit');
  await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(Array.from({length:51},(_,index)=>({...sample,name:`limit-${index}.pdf`})));
  await expect(page.getByRole('status')).toContainText('hasta 50 archivos');
  await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('first'));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(1);
  await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('second',{title:'Other'}));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(2);
  await expect(page.locator('.zu-pdf-thumb img')).toHaveCount(2);
  expect(await page.locator('.zu-pdf-tool button').evaluateAll(buttons=>buttons.filter(button=>!button.querySelector('svg')).map(button=>button.textContent))).toEqual([]);
  await page.getByRole('button',{name:'Subir second.pdf',exact:true}).click();
  await expect(page.locator('.zu-pdf-file-info strong').first()).toHaveText('second.pdf');
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Generar PDF',exact:true}).click();
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
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Generar PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const pdf=await PDFDocument.load(await download(page,'Descargar merge-pdf.pdf'),{updateMetadata:false});
  expect(pdf.getPageCount()).toBe(3);expect(pdf.catalog.has(PDFName.of('Outlines'))).toBe(true);
});
test('organize: previews, reverse, exclude, rotate, duplicate and native extraction metadata',async({page},testInfo)=>{
  await open(page,'Organizar PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('source'));
  await expect(page.locator('.zu-pdf-thumb img')).toHaveCount(3);
  await expect(page.getByRole('button',{name:'Seleccionar todas',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Desmarcar todas',exact:true}).click();
  await expect(page.getByRole('button',{name:'Desmarcar todas',exact:true})).toBeDisabled();
  await expect(page.locator('.zu-pdf-page-meta strong')).toHaveCount(0);
  await expect(page.locator('.zu-pdf-page').first()).toHaveCSS('opacity','1');
  await page.getByRole('checkbox',{name:'Página 2',exact:true}).check();
  await expect(page.locator('.zu-pdf-page-meta strong')).toHaveCount(1);
  await expect(page.locator('.zu-pdf-page').first()).toContainText('Original 2');
  await expect(page.locator('.zu-pdf-page').first().locator('.zu-pdf-page-meta strong')).toHaveText('Ahora 1');
  await expect(page.getByRole('button',{name:'Invertir orden',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Seleccionar todas',exact:true}).click();
  await page.getByRole('button',{name:'Invertir orden',exact:true}).click();
  await expect(page.locator('.zu-pdf-page-meta').first()).toContainText('Original 3');
  await expect(page.locator('.zu-pdf-page-meta').first()).toContainText('Ahora 1');
  if(!testInfo.project.name.includes('mobile')){
    await page.locator('.zu-pdf-page').first().dragTo(page.locator('.zu-pdf-page').nth(2));
    await expect(page.locator('.zu-pdf-page-meta').first()).toContainText('Original 1');
    await expect(page.locator('.zu-pdf-page-meta').first()).toContainText('Ahora 1');
  }
  await page.locator('.zu-pdf-editor').evaluate(element=>{element.scrollTop=element.scrollHeight;});
  await expect(page.locator('.zu-pdf-actions')).toBeInViewport();
  await page.getByRole('button',{name:'Girar 90° · 1',exact:true}).click();
  await page.getByRole('button',{name:'Duplicar · 1',exact:true}).click();
  await page.locator('.zu-pdf-page').last().getByRole('checkbox').uncheck();
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Generar PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const pdf=await PDFDocument.load(await download(page,'Descargar organize-pdf.pdf'),{updateMetadata:false});
  expect(pdf.getTitle()).toBe('Untitled');expect(pdf.getPageCount()).toBe(3);expect(pdf.getPages().map(p=>p.getRotation().angle)).toEqual([90,90,0]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('organize.png'),fullPage:true});
});
test('split: click-to-create ranges, independent output and ZIP',async({page},testInfo)=>{
  await open(page,'Dividir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('source'));
  await expect(page.locator('.zu-pdf-thumb img')).toHaveCount(3);
  await page.getByRole('button',{name:'Crear rango',exact:true}).click();
  await expect(page.getByText('Haz clic sobre las páginas para seleccionarlas.')).toBeVisible();
  await page.locator('.zu-pdf-page').nth(0).click();
  await page.locator('.zu-pdf-page').nth(2).click();
  await expect(page.locator('.zu-pdf-range-thumbnails')).toHaveCount(1);
  await page.getByRole('button',{name:'Crear rango',exact:true}).click();
  await expect(page.locator('.zu-pdf-range-item').nth(1)).toContainText('split1.pdf · 2 páginas');
  await expect(page.locator('.zu-pdf-range-item').first().locator('.zu-pdf-range-thumbnails')).toHaveCount(0);
  await page.locator('.zu-pdf-page').nth(1).click();
  await page.locator('.zu-pdf-page').nth(0).click();
  await expect(page.locator('.zu-pdf-range-item').first()).toContainText('split2.pdf · 2 páginas');
  await expect(page.locator('.zu-pdf-range-item').nth(1)).toContainText('split1.pdf · 2 páginas');
  await expect(page.locator('.zu-pdf-page').nth(0)).toHaveClass(/is-active-range/);
  await expect(page.locator('.zu-pdf-range-item')).toHaveCount(2);
  await page.locator('.zu-pdf-split-actions').getByRole('button',{name:'Extraer PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const entries=unzipSync(await download(page,'Descargar todo en ZIP'));
  expect(Object.keys(entries).sort()).toEqual(['split1.pdf','split2.pdf']);
  expect((await PDFDocument.load(entries['split2.pdf'])).getPageCount()).toBe(2);
  expect(Buffer.from(entries['split1.pdf'])).toEqual(await download(page,'Descargar split1.pdf'));
  await page.screenshot({path:testInfo.outputPath('split.png'),fullPage:true});
});
test('split: range lifecycle keeps pages, names, shared selections and custom deletion',async({page})=>{
  await open(page,'Dividir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('source'));
  // A first page click creates split1 without requiring an explicit range first.
  await page.locator('.zu-pdf-page').nth(0).click();
  await expect(page.locator('.zu-pdf-range-item')).toHaveCount(1);
  await expect(page.locator('.zu-pdf-range-item').first()).toContainText('split1.pdf · 1 páginas');
  await expect(page.locator('.zu-pdf-page').nth(0)).toHaveClass(/is-active-range/);
  // New ranges are inserted above, retain their own stable name and do not erase split1.
  await page.getByRole('button',{name:'Crear rango',exact:true}).click();
  await expect(page.locator('.zu-pdf-range-item').first()).toContainText('split2.pdf · 0 páginas');
  await expect(page.locator('.zu-pdf-range-item').nth(1)).toContainText('split1.pdf · 1 páginas');
  await page.locator('.zu-pdf-page').nth(0).click();
  await expect(page.locator('.zu-pdf-range-item').first()).toContainText('split2.pdf · 1 páginas');
  await expect(page.locator('.zu-pdf-range-item').nth(1)).toContainText('split1.pdf · 1 páginas');
  await expect(page.locator('.zu-pdf-page').nth(0)).toHaveClass(/is-active-range/);
  await page.getByRole('button',{name:'Crear rango',exact:true}).click();
  await expect(page.locator('.zu-pdf-range-item').first()).toContainText('split3.pdf · 0 páginas');
  await expect(page.locator('.zu-pdf-range-item').nth(1)).toContainText('split2.pdf · 1 páginas');
  await expect(page.locator('.zu-pdf-range-item').nth(2)).toContainText('split1.pdf · 1 páginas');
  // Deleting a collapsed range uses the in-app confirmation rather than a native browser dialog.
  await page.locator('.zu-pdf-range-item').nth(1).hover();
  await page.getByRole('button',{name:'Eliminar rango split2.pdf',exact:true}).click();
  await expect(page.getByRole('alertdialog',{name:'Eliminar rango'})).toBeVisible();
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('.zu-pdf-range-item')).toHaveCount(3);
});
test('a tagged PDF is preserved by a native whole-document merge',async({page})=>{
  await open(page,'Unir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('tagged',{feature:'tagged'}));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(1);
  await expect(page.getByText('Este PDF contiene etiquetas de accesibilidad')).toHaveCount(0);
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Generar PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const pdf=await PDFDocument.load(await download(page,'Descargar merge-pdf.pdf'),{updateMetadata:false});
  expect(pdf.catalog.has(PDFName.of('MarkInfo'))).toBe(true);expect(pdf.catalog.has(PDFName.of('StructTreeRoot'))).toBe(true);
  expect(pdf.getPages()[0].node.has(PDFName.of('StructParents'))).toBe(true);
});
test('tagged page extraction continues without warnings or consent',async({page})=>{
  await open(page,'Dividir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('tagged',{feature:'tagged'}));
  await page.getByRole('button',{name:'Crear rango',exact:true}).click();
  await page.locator('.zu-pdf-page').nth(0).click();
  await page.getByRole('button',{name:'Crear rango',exact:true}).click();
  await page.locator('.zu-pdf-page').nth(1).click();
  await page.locator('.zu-pdf-page').nth(2).click();
  await expect(page.getByText(/estructura de lectura accesible|etiquetas de accesibilidad|autorizo/i)).toHaveCount(0);
  await expect(page.locator('.zu-pdf-split-actions').getByRole('button',{name:'Extraer PDF',exact:true})).toBeEnabled();
  await page.locator('.zu-pdf-split-actions').getByRole('button',{name:'Extraer PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  await expect(page.getByText(/estructura de lectura accesible|etiquetas de accesibilidad|autorizo/i)).toHaveCount(0);
  const pdf=await PDFDocument.load(await download(page,'Descargar split2.pdf'),{updateMetadata:false});
  expect(pdf.catalog.has(PDFName.of('StructTreeRoot'))).toBe(false);expect(pdf.getPages()[0].node.has(PDFName.of('StructParents'))).toBe(false);
});
test('signed PDF is explained; next valid selection recovers',async({page})=>{
  await open(page,'Unir PDF');await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('signed',{feature:'signature'}));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(1);
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Generar PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('estructura que todavía no podemos conservar');
  await expect(page.locator('.zu-pdf-results')).toHaveCount(0);
  await page.getByRole('button',{name:'Limpiar',exact:true}).click();
  await page.getByLabel('Seleccionar PDF',{exact:true}).setInputFiles(await fixture('good'));
  await expect(page.locator('.zu-pdf-files li')).toHaveCount(1);
  await page.locator('.zu-pdf-actions').getByRole('button',{name:'Generar PDF',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  await page.getByRole('button',{name:'Limpiar',exact:true}).click();await expect(page.locator('.zu-pdf-results')).toHaveCount(0);
});

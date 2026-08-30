import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFDocument, PDFName, PDFRef } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { createPdfToolsClient, parsePdfRanges } from '../dist/pdf.js';
import { makePdf } from '../test/pdf-fixtures.mjs';
import { formatPdfNumberExact } from '../scripts/pdf/exact-pdf-number.mjs';

const dir=await mkdtemp(join(tmpdir(),'zutools-pdf-tests-'));
const bridge=join(dir,'bridge.mjs');
await writeFile(bridge,`import {parentPort,workerData} from 'node:worker_threads'; globalThis.self=globalThis; self.postMessage=(...args)=>parentPort.postMessage(...args); parentPort.on('message',data=>self.onmessage?.({data})); await import(workerData.url);`);
let created=0,terminated=0; const terminations=[];
function client() {return createPdfToolsClient({workerFactory:url=>{
  created++;const worker=new Worker(pathToFileURL(bridge),{workerData:{url:String(url)}});
  const handle={postMessage:(...args)=>worker.postMessage(...args),terminate(){terminated++;terminations.push(worker.terminate());}};
  worker.on('message',data=>handle.onmessage?.({data}));worker.on('error',e=>handle.onerror?.(e));return handle;
}});}
const load=bytes=>PDFDocument.load(bytes,{updateMetadata:false});
const plain=await makePdf(),other=await makePdf({title:'Different title'});

test('PDF native wrapper: LibPDF operations, product policy and worker lifecycle',async t=>{
 const api=client();t.after(async()=>{api.dispose();await Promise.all(terminations);assert.equal(created,terminated);});

 await t.test('merge delegates page copying to LibPDF and only applies blank-metadata policy',async()=>{
   const before=plain.slice(),result=await api.mergePdf([plain,other]),pdf=await load(result.outputs[0].bytes);
   assert.equal(pdf.getPageCount(),6);assert.equal(pdf.getTitle(),undefined);assert.equal(pdf.getAuthor(),undefined);
   assert.equal(pdf.context.lookup(pdf.catalog.get(PDFName.of('Metadata'))).contents.length,0);
   assert.equal([...pdf.context.lookup(pdf.context.trailerInfo.Info).keys()].length,0);
   assert.deepEqual(result.warnings,[]);assert.equal(result.validation,'save-reload');assert.deepEqual(plain,before);
 });

 await t.test('a single tagged document is preserved natively without consent',async()=>{
   const tagged=await makePdf({feature:'tagged'}),inspection=await api.inspect(tagged);
   assert.equal(inspection.features.accessibilityTags,true);
   const result=await api.mergePdf([tagged]),pdf=await load(result.outputs[0].bytes);
   assert.equal(pdf.catalog.has(PDFName.of('MarkInfo')),true);assert.equal(pdf.catalog.has(PDFName.of('StructTreeRoot')),true);
   assert.equal(pdf.getPages()[0].node.has(PDFName.of('StructParents')),true);assert(!result.warnings.includes('ACCESSIBILITY_TAGS_REMOVED'));
 });

 await t.test('tagged additional inputs require consent and native untagged copying',async()=>{
   const tagged=await makePdf({feature:'tagged'});
   await assert.rejects(api.mergePdf([plain,tagged]),{code:'ACCESSIBILITY_CONSENT_REQUIRED'});
   const result=await api.mergePdf([plain,tagged],{accessibility:'remove'}),pdf=await load(result.outputs[0].bytes);
   assert(result.warnings.includes('ACCESSIBILITY_TAGS_REMOVED'));
   assert.equal(pdf.catalog.has(PDFName.of('MarkInfo')),false);assert.equal(pdf.catalog.has(PDFName.of('StructTreeRoot')),false);
   assert(pdf.getPages().every(page=>!page.node.has(PDFName.of('StructParents'))));
 });

 await t.test('whole-document organization uses native page-tree mutation and preserves catalog structures',async()=>{
   const tagged=await makePdf({feature:'tagged',bookmarks:true,labels:true}),result=await api.organizePdf(tagged,[{index:2,rotation:90},{index:0,rotation:0},{index:1,rotation:0}]);
   const pdf=await load(result.outputs[0].bytes);
   assert.deepEqual(pdf.getPages().map(page=>page.getRotation().angle),[90,0,0]);
   for(const key of ['MarkInfo','StructTreeRoot','Outlines','PageLabels'])assert.equal(pdf.catalog.has(PDFName.of(key)),true,key);
   assert.equal(pdf.getTitle(),'Source');assert.deepEqual(result.warnings,[]);
 });

 await t.test('native extraction handles exclusion and duplication without custom graph copying',async()=>{
   const result=await api.organizePdf(plain,[{index:2,rotation:90},{index:0,rotation:0},{index:0,rotation:180}]),pdf=await load(result.outputs[0].bytes);
   assert.equal(pdf.getPageCount(),3);assert.deepEqual(pdf.getPages().map(page=>page.getRotation().angle),[90,0,180]);
   assert.equal(pdf.getTitle(),'Untitled');assert(!result.warnings.includes('DOCUMENT_METADATA_OMITTED_BY_NATIVE_EXTRACTION'));
 });

 await t.test('tagged extraction is consented and performed by LibPDF includeStructure=false',async()=>{
   const tagged=await makePdf({feature:'tagged'}),plan=[{index:0,rotation:0},{index:2,rotation:0}];
   await assert.rejects(api.organizePdf(tagged,plan),{code:'ACCESSIBILITY_CONSENT_REQUIRED'});
   const result=await api.organizePdf(tagged,plan,{accessibility:'remove'}),pdf=await load(result.outputs[0].bytes);
   assert(result.warnings.includes('ACCESSIBILITY_TAGS_REMOVED'));assert.equal(pdf.catalog.has(PDFName.of('StructTreeRoot')),false);
   assert(pdf.getPages().every(page=>!page.node.has(PDFName.of('StructParents'))));
 });

 await t.test('split uses native extractPages and produces matching independent PDFs and ZIP',async()=>{
   const result=await api.splitPdf(plain,[[0,2],[1]]),archive=unzipSync(result.archive);
   assert.deepEqual(Object.keys(archive),result.outputs.map(output=>output.name));
   for(const output of result.outputs)assert.deepEqual(archive[output.name],output.bytes);
   assert.equal((await load(result.outputs[0].bytes)).getPageCount(),2);assert.equal((await load(result.outputs[1].bytes)).getPageCount(),1);
 });

 await t.test('split of tagged documents requires explicit native structure omission',async()=>{
   const tagged=await makePdf({feature:'tagged'});
   await assert.rejects(api.splitPdf(tagged,[[0],[1,2]]),{code:'ACCESSIBILITY_CONSENT_REQUIRED'});
   const result=await api.splitPdf(tagged,[[0],[1,2]],{accessibility:'remove'});
   assert(result.warnings.includes('ACCESSIBILITY_TAGS_REMOVED'));
   for(const output of result.outputs)assert.equal((await load(output.bytes)).catalog.has(PDFName.of('StructTreeRoot')),false);
 });

 await t.test('a one-part split containing every page stays a native whole-document permutation',async()=>{
   const tagged=await makePdf({feature:'tagged',bookmarks:true}),result=await api.splitPdf(tagged,[[2,0,1]]),pdf=await load(result.outputs[0].bytes);
   assert.equal(pdf.catalog.has(PDFName.of('StructTreeRoot')),true);assert.equal(pdf.catalog.has(PDFName.of('Outlines')),true);
   assert.deepEqual(result.warnings,[]);
 });

 await t.test('links and bookmarks remain native structures during a whole-page permutation',async()=>{
   const bytes=await makePdf({links:true,bookmarks:true}),result=await api.organizePdf(bytes,[{index:2,rotation:0},{index:0,rotation:0},{index:1,rotation:0}]);
   const pdf=await load(result.outputs[0].bytes),pages=pdf.getPages(),annots=pages[1].node.lookup(PDFName.of('Annots'));
   const uri=pdf.context.lookup(annots.get(0)),local=pdf.context.lookup(annots.get(1));
   const destination=pdf.context.lookup(local.get(PDFName.of('Dest')));
   assert.equal(destination.get(0).toString(),pages[0].ref.toString());
   assert.equal(pdf.context.lookup(uri.get(PDFName.of('A'))).lookup(PDFName.of('URI')).decodeText(),'https://example.com/');
   assert.equal(pdf.catalog.has(PDFName.of('Outlines')),true);
 });

 await t.test('native extraction and copying are not preemptively blocked for document-level roots',async()=>{
   const form=await makePdf({form:true}),named=await makePdf({named:true});
   for(const result of [
     await api.organizePdf(form,[{index:0,rotation:0}]),
     await api.splitPdf(form,[[0],[1,2]]),
     await api.organizePdf(named,[{index:0,rotation:0}]),
     await api.mergePdf([plain,form]),
     await api.mergePdf([plain,named]),
   ])assert(result.warnings.some(code=>code.includes('DOCUMENT_STRUCTURES')));
 });

 await t.test('first-document forms stay editable because LibPDF preserves its catalog',async()=>{
   const form=await makePdf({form:true}),result=await api.mergePdf([form,plain]),pdf=await load(result.outputs[0].bytes);
   assert.equal(pdf.getForm().getTextField('customer').getText(),'Editable value');assert(pdf.getForm().getCheckBox('customer-checked').isChecked());
   const organized=await api.organizePdf(form,[{index:2,rotation:0},{index:1,rotation:0},{index:0,rotation:0}]);
   assert.equal((await load(organized.outputs[0].bytes)).getForm().getTextField('customer').getText(),'Editable value');
 });

 await t.test('unknown structures are trusted and preserved when LibPDF preserves the document catalog',async()=>{
   for(const feature of ['layers','script','attachment','xfa']) {
     const bytes=await makePdf({feature}),inspection=await api.inspect(bytes),result=await api.mergePdf([bytes]),pdf=await load(result.outputs[0].bytes);
     assert.equal(inspection.pageCount,3,feature);
     if(feature==='layers')assert.equal(pdf.catalog.has(PDFName.of('OCProperties')),true);
     if(feature==='script')assert.equal(pdf.catalog.has(PDFName.of('OpenAction')),true);
     if(feature==='xfa')assert.equal(pdf.catalog.lookup(PDFName.of('AcroForm')).has(PDFName.of('XFA')),true);
   }
 });

 await t.test('signed documents remain blocked because rewriting invalidates signatures',async()=>{
   await assert.rejects(api.mergePdf([await makePdf({feature:'signature'})]),{code:'UNSUPPORTED_DOCUMENT'});
 });

 await t.test('LibPDF recovery is accepted and reported instead of being preemptively blocked',async()=>{
   const damaged=new TextEncoder().encode(new TextDecoder('latin1').decode(plain).replace(/startxref\s+\d+/,'startxref\n1'));
   const inspection=await api.inspect(damaged);assert.equal(inspection.pageCount,3);
   const result=await api.mergePdf([damaged]);assert(result.warnings.includes('SOURCE_RECOVERED'));
 });

 await t.test('dangling optional roots are left to LibPDF rather than filtered by an allowlist',async()=>{
   const source=await load(plain);source.catalog.set(PDFName.of('Outlines'),PDFRef.of(999,0));
   const bytes=await source.save({useObjectStreams:false,updateFieldAppearances:false});
   assert.equal((await api.inspect(bytes)).pageCount,3);
   const output=await load((await api.mergePdf([bytes])).outputs[0].bytes);assert.equal(output.catalog.has(PDFName.of('Outlines')),true);
 });

 await t.test('native copy shim preserves inherited precision and resources for additional inputs',async()=>{
   const inherited=await makePdf({inherited:true,objectStreams:true}),result=await api.mergePdf([plain,inherited]),pdf=await load(result.outputs[0].bytes),page=pdf.getPages()[3];
   assert.equal(page.getWidth(),320.123456789);assert.equal(page.getHeight(),240.987654321);assert.equal(page.getRotation().angle,90);
   assert(page.node.lookup(PDFName.of('Resources')));
 });

 await t.test('precision patch emits exact finite PDF decimals without exponent notation',()=>{
   for(const value of [0,-0,1.2345678901234567,0.000000123456789,1e21,1e-300,Number.MAX_VALUE,Number.MIN_VALUE]) {
     const token=formatPdfNumberExact(value);assert(!/[eE]/.test(token));assert.equal(Number(token),value===0?0:value);
   }
   for(const value of [NaN,Infinity,-Infinity])assert.throws(()=>formatPdfNumberExact(value));
 });

 await t.test('ranges, limits, cancellation, concurrency and disposal remain adapter policy',async()=>{
   assert.deepEqual(parsePdfRanges('1,3; 2',3),[[0,2],[1]]);
   for(const bad of ['0','1,1','4','2-1','1;;2','1-999999999'])assert.throws(()=>parsePdfRanges(bad,3));
   await assert.rejects(api.splitPdf(plain,[[0],[99]]),{code:'INVALID_INPUT'});
   await assert.rejects(api.splitPdf(plain,[[0],[1]],{limits:{maxOutputBytes:10}}),{code:'LIMIT_EXCEEDED'});
   const controller=new AbortController();await assert.rejects(api.mergePdf([plain],{signal:controller.signal,onProgress:()=>controller.abort()}),{code:'ABORTED'});
   await assert.rejects(api.inspect(plain,{timeoutMs:1}),{code:'TIMEOUT'});
   const one=api.inspect(plain);await assert.rejects(api.inspect(plain),{code:'BUSY'});await one;
   const disposable=client(),pending=disposable.inspect(plain);disposable.dispose();await assert.rejects(pending,{code:'DISPOSED'});
 });
});

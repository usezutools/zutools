import React, { useEffect, useRef, useState } from 'react';
import { createPdfToolsClient, PDF_LIMITS, parsePdfRanges } from '@zutools/core/pdf';
import { downloadBlob, formatBytes } from './shared';
import './PdfTools.css';
import './PdfAccessibility.css';

const COPY = {
  es: {
    'merge-pdf':'Unir PDF','organize-pdf':'Organizar PDF','split-pdf':'Dividir PDF',
    subtitle:'Tus archivos se procesan en este dispositivo. Los originales no se modifican.',
    choose:'Seleccionar PDF',drop:'Arrastra tus PDF aquí o selecciónalos',local:'Local · Sin subir archivos',beta:'Beta',
    support:'El procesamiento se realiza en este dispositivo y el resultado se verifica antes de ofrecer la descarga. Los archivos originales permanecen intactos.',
    limits:'Hasta 16 MiB en total, 200 páginas y 50 archivos de salida.',
    loading:'Comprobando archivos…',processing:'Procesando…',checking:'Verificando resultado…',cancel:'Cancelar',clear:'Limpiar',
    pages:'páginas',page:'Página',of:'de',up:'Subir',down:'Bajar',remove:'Quitar archivo',duplicate:'Duplicar',rotate:'Girar 90°',
    reverse:'Invertir orden',all:'Seleccionar todas',none:'Desmarcar todas',selected:'seleccionadas',
    previous:'Anterior',next:'Siguiente',preview:'Miniatura',previewFailed:'Miniatura no disponible',
    ranges:'Rangos de salida',rangeHelp:'Separa archivos con ; y páginas con comas. Ejemplo: 1-3; 4,6.',each:'Un PDF por página',
    download:'Descargar',zip:'Descargar todo en ZIP',ready:'Resultado verificado. Los originales permanecen intactos.',
    pruned:'La copia se ha creado sin parte de la navegación o estructura interactiva del original. Revisa los marcadores, formularios y navegación antes de sustituirlo.',
    accessibilityInfo:'Este PDF contiene una estructura de lectura accesible. La copia conservará las páginas y el contenido visible, pero se creará sin esa estructura.',
    accessibilityConfirm:'Entiendo y autorizo retirar las etiquetas de accesibilidad de la copia',
    accessibilityRemoved:'La copia se ha generado sin las etiquetas de accesibilidad. El original no se ha modificado.',
    INVALID_INPUT:'Revisa los archivos, las páginas o los rangos indicados.',INVALID_PDF:'No se pudo leer el PDF con garantías. El original sigue intacto.',
    UNSUPPORTED_DOCUMENT:'Este PDF contiene una estructura que todavía no podemos conservar. No se ha generado una copia degradada.',
    ACCESSIBILITY_CONSENT_REQUIRED:'Confirma que autorizas retirar las etiquetas de accesibilidad de la copia.',
    REPAIR_REQUIRED:'El PDF necesita revisión o reparación y no puede procesarse de forma segura.',
    FORM_CONFLICT:'Los formularios tienen nombres o recursos incompatibles, o se están duplicando sus páginas. No se pueden combinar de forma segura todavía.',
    PARTIAL_FORM:'Un campo del formulario abarca varias páginas. Mantén juntas todas las páginas de ese campo.',
    DESTINATION_REMOVED:'Un enlace apunta a una página excluida. Incluye esa página en la misma salida para conservarlo.',
    DESTINATION_CONFLICT:'Los PDF tienen destinos con el mismo nombre. No se pueden combinar sin resolver esa ambigüedad.',
    DOCUMENT_CONFLICT:'Los PDF tienen preferencias o perfiles de color incompatibles. No podemos conservar ambos en esta operación.',
    VALIDATION_FAILED:'La salida no superó la comprobación de conservación. No se entrega ningún archivo.',
    LIMIT_EXCEEDED:'Se ha superado el límite de archivos, páginas, tamaño o complejidad. Prueba con menos documentos.',
    TIMEOUT:'Se alcanzó el límite de tiempo. Prueba con un documento más pequeño.',ABORTED:'Operación cancelada.',
    WORKER_FAILED:'No se pudo iniciar el procesamiento PDF. Inténtalo de nuevo.',UNKNOWN:'No se pudo completar la operación.',
  },
  en: {
    'merge-pdf':'Merge PDF','organize-pdf':'Organize PDF','split-pdf':'Split PDF',subtitle:'Files are processed on this device. Originals remain unchanged.',
    choose:'Select PDFs',drop:'Drop PDF files here or choose them',local:'Local · No file uploads',beta:'Beta',
    support:'Processing takes place on this device and the result is verified before download. The original files remain unchanged.',
    limits:'Up to 16 MiB total, 200 pages and 50 output files.',loading:'Checking files…',processing:'Processing…',checking:'Verifying output…',cancel:'Cancel',clear:'Clear',
    pages:'pages',page:'Page',of:'of',up:'Move up',down:'Move down',remove:'Remove file',duplicate:'Duplicate',rotate:'Rotate 90°',
    reverse:'Reverse order',all:'Select all',none:'Deselect all',selected:'selected',previous:'Previous',next:'Next',preview:'Thumbnail',previewFailed:'Preview unavailable',
    ranges:'Output ranges',rangeHelp:'Separate files with ; and pages with commas. Example: 1-3; 4,6.',each:'One PDF per page',
    download:'Download',zip:'Download all as ZIP',ready:'Output verified. Your original files are unchanged.',
    pruned:'The copy was created without some navigation or interactive structure from the original. Review bookmarks, forms and navigation before replacing it.',
    accessibilityInfo:'This PDF contains an accessible reading structure. The copy will keep its pages and visible content, but will be created without that structure.',
    accessibilityConfirm:'I understand and authorize removing accessibility tags from the copy',
    accessibilityRemoved:'The copy was created without accessibility tags. The original was not modified.',
    INVALID_INPUT:'Check the files, page selection or ranges.',INVALID_PDF:'The PDF could not be read safely. The original is unchanged.',
    UNSUPPORTED_DOCUMENT:'This PDF contains a structure we cannot preserve yet. No degraded copy was created.',
    ACCESSIBILITY_CONSENT_REQUIRED:'Confirm that you authorize removing accessibility tags from the copy.',
    REPAIR_REQUIRED:'This PDF needs review or repair and cannot be processed safely.',
    FORM_CONFLICT:'The forms have conflicting names/resources, or their pages are duplicated. This combination is not supported yet.',
    PARTIAL_FORM:'A form field spans multiple pages. Keep all of its pages together.',DESTINATION_REMOVED:'A link targets an excluded page. Include that page in the same output.',
    DOCUMENT_CONFLICT:'The PDFs have conflicting preferences or color profiles.',DESTINATION_CONFLICT:'The PDFs have conflicting named destinations.',VALIDATION_FAILED:'The output failed preservation checks. No file will be delivered.',
    LIMIT_EXCEEDED:'The file, page, size or complexity limit was exceeded. Try fewer documents.',TIMEOUT:'The time limit was reached. Try a smaller document.',
    ABORTED:'Operation cancelled.',WORKER_FAILED:'PDF processing could not start. Try again.',UNKNOWN:'The operation could not be completed.',
  },
};
let sequence = 0;
function save(bytes, name, type='application/pdf') { downloadBlob(new Blob([bytes],{type}),name); }

function PdfTool({ mode, language='es', workerUrl, previewWorkerUrl }) {
  const copy=COPY[language] || COPY.es;
  const api=useRef(null),controller=useRef(null),generation=useRef(0),previewUrls=useRef(new Map());
  const [files,setFiles]=useState([]),[pages,setPages]=useState([]),[ranges,setRanges]=useState(''),[windowIndex,setWindowIndex]=useState(0);
  const [busy,setBusy]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState(''),[result,setResult]=useState(null),[thumbs,setThumbs]=useState({});
  const [drag,setDrag]=useState(null),[removeAccessibility,setRemoveAccessibility]=useState(false);
  const input=useRef(null);
  useEffect(()=>{
    api.current=createPdfToolsClient({workerUrl});
    return ()=>{generation.current++;controller.current?.abort();api.current?.dispose();for(const url of previewUrls.current.values())URL.revokeObjectURL(url);previewUrls.current.clear();};
  },[workerUrl]);
  const invalidate=()=>{setResult(null);setError('');};
  function reset() {
    generation.current++;controller.current?.abort();setFiles([]);setPages([]);setRanges('');setResult(null);setError('');setWindowIndex(0);setThumbs({});setRemoveAccessibility(false);
    for(const url of previewUrls.current.values())URL.revokeObjectURL(url);previewUrls.current.clear(); if(input.current) input.current.value='';
  }
  async function selectFiles(chosen) {
    if(busy)return;
    reset(); if(!chosen.length)return;
    if((mode!=='merge-pdf' && chosen.length!==1) || chosen.length>PDF_LIMITS.maxFiles || chosen.reduce((n,f)=>n+f.size,0)>PDF_LIMITS.maxInputBytes){setError('LIMIT_EXCEEDED');return;}
    const current=++generation.current,abort=new AbortController();controller.current=abort;setBusy(true);setStage('loading');
    try {
      const loaded=[];let totalPages=0;
      for(const file of chosen){
        const bytes=new Uint8Array(await file.arrayBuffer());const info=await api.current.inspect(bytes,{signal:abort.signal});
        totalPages+=info.pageCount;if(totalPages>PDF_LIMITS.maxPages)throw {code:'LIMIT_EXCEEDED'};
        loaded.push({id:++sequence,name:file.name,bytes,info,size:file.size});
      }
      if(current!==generation.current)return;
      setFiles(loaded);setPages(Array.from({length:loaded[0].info.pageCount},(_,index)=>({id:++sequence,index,rotation:0,selected:true})));
      setRanges(`1-${loaded[0].info.pageCount}`);
    }catch(e){if(current===generation.current)setError(e.code || 'UNKNOWN');}
    finally{if(current===generation.current){setBusy(false);setStage('');controller.current=null;}}
  }
  const pageWindow=pages.slice(windowIndex*12,windowIndex*12+12);
  const hasAccessibilityTags=files.some(file=>file.info.features.accessibilityTags);
  const selectedPageIndexes=pages.filter(page=>page.selected).map(page=>page.index);
  const isWholePermutation=files.length>0&&selectedPageIndexes.length===files[0].info.pageCount&&new Set(selectedPageIndexes).size===files[0].info.pageCount;
  let splitIsWholePermutation=false;
  if(mode==='split-pdf'&&files.length){
    try{const groups=parsePdfRanges(ranges,files[0].info.pageCount),group=groups.length===1?groups[0]:[];splitIsWholePermutation=group.length===files[0].info.pageCount&&new Set(group).size===files[0].info.pageCount;}catch{}
  }
  const requiresAccessibilityRemoval=mode==='split-pdf'?hasAccessibilityTags&&!splitIsWholePermutation:
    mode==='merge-pdf'?files.slice(1).some(file=>file.info.features.accessibilityTags):hasAccessibilityTags&&!isWholePermutation;
  const wanted=mode==='merge-pdf'?files.map(file=>({file,index:0})):files.length?pageWindow.map(p=>({file:files[0],index:p.index})):[];
  const previewKey=wanted.map(p=>`${p.file.id}:${p.index}`).join(',');
  useEffect(()=>{
    const abort=new AbortController();let closed=false;
    const pending=wanted.filter(p=>!previewUrls.current.has(`${p.file.id}:${p.index}`));
    void (async()=>{
      if(!pending.length)return;
      const {createPdfPreview}=await import('@zutools/core/pdf-preview');
      for(const file of [...new Set(pending.map(p=>p.file))]){
        let preview;
        try{
          preview=await createPdfPreview(file.bytes,{signal:abort.signal,workerUrl:previewWorkerUrl});
          for(const item of pending.filter(p=>p.file===file)){
            if(closed)return;
            const key=`${file.id}:${item.index}`,blob=await preview.renderPage(item.index),url=URL.createObjectURL(blob);
            if(closed){URL.revokeObjectURL(url);return;}
            const old=previewUrls.current.get(key);if(old)URL.revokeObjectURL(old);
            previewUrls.current.set(key,url);setThumbs(current=>({...current,[key]:url}));
          }
        }catch(e){if(!closed)setThumbs(current=>({...current,...Object.fromEntries(pending.filter(p=>p.file===file).map(p=>[`${file.id}:${p.index}`,false]))}));}
        finally{await preview?.dispose();}
      }
    })().catch(()=>{if(!closed)setThumbs(current=>({...current,...Object.fromEntries(pending.map(p=>[`${p.file.id}:${p.index}`,false]))}));});
    return ()=>{closed=true;abort.abort();};
  },[previewKey,previewWorkerUrl]);
  function reorder(list,from,to,setter){if(from===to||from<0||to<0||to>=list.length)return;const next=[...list];const [item]=next.splice(from,1);next.splice(to,0,item);setter(next);invalidate();}
  function updatePage(id,fn){setPages(current=>current.map(page=>page.id===id?fn(page):page));invalidate();}
  async function run(){
    if(busy||!files.length)return;invalidate();const current=generation.current,abort=new AbortController();controller.current=abort;setBusy(true);setStage('processing');
    try{
      const options={signal:abort.signal,onProgress:p=>setStage(p.phase==='checking-output'?'checking':'processing'),...(requiresAccessibilityRemoval&&removeAccessibility?{accessibility:'remove'}:{})};let value;
      if(mode==='merge-pdf')value=await api.current.mergePdf(files.map(f=>f.bytes),options);
      else if(mode==='organize-pdf')value=await api.current.organizePdf(files[0].bytes,pages.filter(p=>p.selected).map(({index,rotation})=>({index,rotation})),options);
      else value=await api.current.splitPdf(files[0].bytes,parsePdfRanges(ranges,files[0].info.pageCount),options);
      if(current===generation.current)setResult(value);
    }catch(e){if(current===generation.current)setError(e.code || 'UNKNOWN');}
    finally{if(current===generation.current){setBusy(false);setStage('');controller.current=null;}}
  }
  const thumbnail=(file,index,rotation=0)=>{
    const value=thumbs[`${file.id}:${index}`];
    return <div className="zu-pdf-thumb">{value?<img src={value} alt={`${copy.preview} · ${copy.page} ${index+1}`} style={{transform:`rotate(${rotation}deg)`}}/>:<span>{value===false?copy.previewFailed:copy.preview+'…'}</span>}</div>;
  };
  return <div className="mini-tool zu-pdf-tool">
    <div className="zu-pdf-top"><span>{copy.local}</span><b>{copy.beta}</b></div><p>{copy.subtitle}</p>
    <details className="zu-pdf-support"><summary>{language==='en'?'Privacy and processing':'Privacidad y procesamiento'}</summary><p>{copy.support}</p><p>{copy.limits}</p></details>
    <fieldset disabled={busy}>
      <legend className="zu-pdf-sr">{copy[mode]}</legend>
      <label className="zu-pdf-drop" onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();void selectFiles(Array.from(e.dataTransfer.files));}}}>
        <strong>{copy.drop}</strong><small>{copy.limits}</small><input ref={input} type="file" accept="application/pdf,.pdf" multiple={mode==='merge-pdf'} aria-label={copy.choose} onChange={e=>void selectFiles(Array.from(e.target.files || []))}/>
      </label>
      {files.length>0&&mode==='merge-pdf'&&<ol className="zu-pdf-files">{files.map((file,index)=><li key={file.id} draggable onDragStart={()=>setDrag(index)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(drag!==null)reorder(files,drag,index,setFiles);setDrag(null);}} onDragEnd={()=>setDrag(null)}>
        {thumbnail(file,0)}<div className="zu-pdf-file-info"><strong>{file.name}</strong><small>{file.info.pageCount} {copy.pages} · {formatBytes(file.size)}</small></div>
        <div className="zu-pdf-buttons"><button type="button" aria-label={`${copy.up} ${file.name}`} disabled={!index} onClick={()=>reorder(files,index,index-1,setFiles)}>↑</button><button type="button" aria-label={`${copy.down} ${file.name}`} disabled={index===files.length-1} onClick={()=>reorder(files,index,index+1,setFiles)}>↓</button><button type="button" aria-label={`${copy.remove} ${file.name}`} onClick={()=>{setFiles(current=>current.filter(f=>f.id!==file.id));invalidate();}}>×</button></div>
      </li>)}</ol>}
      {files.length>0&&mode!=='merge-pdf'&&<>
        <p className="zu-pdf-source"><strong>{files[0].name}</strong><span>{files[0].info.pageCount} {copy.pages} · {formatBytes(files[0].size)}</span></p>
        {mode==='organize-pdf'&&<div className="zu-pdf-toolbar"><button type="button" onClick={()=>{setPages(current=>[...current].reverse());invalidate();}}>{copy.reverse}</button><button type="button" onClick={()=>{setPages(current=>current.map(p=>({...p,selected:true})));invalidate();}}>{copy.all}</button><button type="button" onClick={()=>{setPages(current=>current.map(p=>({...p,selected:false})));invalidate();}}>{copy.none}</button><span>{pages.filter(p=>p.selected).length} {copy.selected}</span></div>}
        <div className="zu-pdf-pages">{pageWindow.map((page,position)=>{const index=windowIndex*12+position;return <div key={page.id} className={`zu-pdf-page ${page.selected?'':'excluded'}`} draggable={mode==='organize-pdf'} onDragStart={()=>setDrag(index)} onDragOver={e=>{if(mode==='organize-pdf')e.preventDefault();}} onDrop={e=>{if(mode==='organize-pdf'){e.preventDefault();if(drag!==null)reorder(pages,drag,index,setPages);setDrag(null);}}} onDragEnd={()=>setDrag(null)}>
          {thumbnail(files[0],page.index,page.rotation)}
          <label>{mode==='organize-pdf'&&<input type="checkbox" checked={page.selected} onChange={e=>updatePage(page.id,p=>({...p,selected:e.target.checked}))}/>} {copy.page} {page.index+1}{page.rotation?` · +${page.rotation}°`:''}</label>
          {mode==='organize-pdf'&&<div className="zu-pdf-buttons"><button type="button" aria-label={`${copy.up} ${index+1}`} disabled={!index} onClick={()=>reorder(pages,index,index-1,setPages)}>↑</button><button type="button" aria-label={`${copy.down} ${index+1}`} disabled={index===pages.length-1} onClick={()=>reorder(pages,index,index+1,setPages)}>↓</button><button type="button" aria-label={`${copy.rotate} · ${index+1}`} onClick={()=>updatePage(page.id,p=>({...p,rotation:(p.rotation+90)%360}))}>↻</button><button type="button" aria-label={`${copy.duplicate} · ${index+1}`} disabled={pages.length>=PDF_LIMITS.maxPages} onClick={()=>{setPages(current=>[...current.slice(0,index+1),{...page,id:++sequence},...current.slice(index+1)]);invalidate();}}>+</button></div>}
        </div>;})}</div>
        {pages.length>12&&<div className="zu-pdf-pagination"><button type="button" disabled={!windowIndex} onClick={()=>setWindowIndex(n=>n-1)}>{copy.previous}</button><span>{windowIndex+1} {copy.of} {Math.ceil(pages.length/12)}</span><button type="button" disabled={(windowIndex+1)*12>=pages.length} onClick={()=>setWindowIndex(n=>n+1)}>{copy.next}</button></div>}
        {mode==='split-pdf'&&<div className="zu-pdf-ranges"><label><strong>{copy.ranges}</strong><input type="text" value={ranges} maxLength={4000} onChange={e=>{setRanges(e.target.value);invalidate();}} /></label><small>{copy.rangeHelp}</small><button type="button" disabled={files[0].info.pageCount>PDF_LIMITS.maxOutputs} onClick={()=>{setRanges(Array.from({length:files[0].info.pageCount},(_,i)=>i+1).join('; '));invalidate();}}>{copy.each}</button></div>}
      </>}
      {requiresAccessibilityRemoval&&<div className="zu-pdf-accessibility"><p>{copy.accessibilityInfo}</p><label><input type="checkbox" checked={removeAccessibility} onChange={e=>{setRemoveAccessibility(e.target.checked);invalidate();}}/> {copy.accessibilityConfirm}</label></div>}
      <div className="zu-pdf-actions"><button type="button" className="mini-action" disabled={!files.length||(mode==='organize-pdf'&&!pages.some(p=>p.selected))||(requiresAccessibilityRemoval&&!removeAccessibility)} onClick={()=>void run()}>{copy[mode]}</button><button type="button" onClick={reset}>{copy.clear}</button></div>
    </fieldset>
    {busy&&<button type="button" className="zu-pdf-cancel" onClick={()=>controller.current?.abort()}>{copy.cancel}</button>}
    <p role="status" aria-live="polite" className={error?'zu-pdf-error':''}>{error?(copy[error] || copy.UNKNOWN):busy?copy[stage]:result?copy.ready:''}</p>
    {result&&<section className="zu-pdf-results" aria-label={copy.download}>{result.archive&&<button type="button" className="mini-action" onClick={()=>save(result.archive,'split-pdf.zip','application/zip')}>{copy.zip}</button>}{result.outputs.map(output=><button type="button" key={output.name} onClick={()=>save(output.bytes,output.name)}>{copy.download} {output.name} · {output.pageCount} {copy.pages}</button>)}{result.warnings.some(code=>['BOOKMARKS_FOR_REMOVED_PAGES_OMITTED','DOCUMENT_STRUCTURES_OMITTED_BY_NATIVE_EXTRACTION','DOCUMENT_STRUCTURES_FROM_ADDITIONAL_INPUTS_OMITTED'].includes(code))&&<p>{copy.pruned}</p>}{result.warnings.includes('ACCESSIBILITY_TAGS_REMOVED')&&<p>{copy.accessibilityRemoved}</p>}</section>}
  </div>;
}
/** @typedef {{language?: 'es'|'en', workerUrl?: string|URL, previewWorkerUrl?: string|URL}} PdfToolProps */
/** @param {PdfToolProps} props */
export function MergePdf(props){return <PdfTool {...props} mode="merge-pdf"/>;}
/** @param {PdfToolProps} props */
export function OrganizePdf(props){return <PdfTool {...props} mode="organize-pdf"/>;}
/** @param {PdfToolProps} props */
export function SplitPdf(props){return <PdfTool {...props} mode="split-pdf"/>;}

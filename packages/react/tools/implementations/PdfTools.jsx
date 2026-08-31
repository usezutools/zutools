import React, { useEffect, useRef, useState } from 'react';
import {
  Archive, ArrowDown, ArrowUp, ArrowUpDown, CheckSquare2, ChevronLeft,
  ChevronRight, CopyPlus, Download, FilePlus2, GripVertical,
  Pencil, Plus, RotateCcw, RotateCw, ShieldCheck, Square, Trash2, Upload, X,
} from 'lucide-react';
import { createPdfToolsClient, PDF_LIMITS } from '@zutools/core/pdf';
import { downloadBlob, formatBytes } from './shared';
import './PdfTools.css';

const COPY = {
  es: {
    'merge-pdf':'Unir PDF','organize-pdf':'Organizar PDF','split-pdf':'Dividir PDF',
    'merge-pdf-description':'Combina varios PDF en el orden que elijas.',
    'organize-pdf-description':'Reordena, gira, duplica o elimina páginas de un PDF.',
    'split-pdf-description':'Divide un PDF en varios archivos por páginas o rangos.',
    privacy:'Privado en tu equipo',privacyDetail:'Tus archivos se procesan solo en este dispositivo: no se envían a servidores ni a terceros. Reduce la exposición de datos personales y de tu empresa.',drop:'Arrastra tus PDF aquí',dropActive:'Suelta los PDF para añadirlos',
    multiple:'Puedes seleccionar varios archivos PDF.',single:'Selecciona un único archivo PDF.',
    addFiles:'Añadir archivos',addFile:'Añadir archivo',replaceFile:'Cambiar archivo',choose:'Seleccionar PDF',
    loading:'Comprobando archivos…',processing:'Procesando…',checking:'Verificando resultado…',cancel:'Cancelar',clear:'Limpiar',reset:'Restablecer',generate:'Generar PDF',
    pages:'páginas',page:'Página',file:'Archivo',original:'Original',now:'Ahora',of:'de',up:'Subir',down:'Bajar',remove:'Quitar archivo',deletePage:'Eliminar página',duplicate:'Duplicar',rotate:'Girar 90°',
    reverse:'Invertir orden',all:'Seleccionar todas',none:'Desmarcar todas',selected:'seleccionadas',dragPage:'Arrastra para recolocar',dropHere:'Suelta aquí',
    previous:'Anterior',next:'Siguiente',preview:'Miniatura',previewFailed:'Miniatura no disponible',
    ranges:'Archivos de salida',createRange:'Crear rango',deleteRange:'Eliminar rango',confirmDeleteRange:'¿Eliminar este rango? Las páginas volverán a quedar disponibles.',editRange:'Haz clic para editar',dragReorder:'Arrastra y suelta las miniaturas para cambiar el orden.',rangeHelp:'Crea un rango y haz clic en las páginas de la izquierda para añadirlas.',selectPages:'Haz clic sobre las páginas para seleccionarlas.',noRanges:'Crea un rango para empezar a seleccionar páginas.',extract:'Extraer PDF',
    download:'Descargar',zip:'Descargar todo en ZIP',ready:'Resultado verificado. Los originales permanecen intactos.',
    FILE_LIMIT:`Puedes añadir hasta ${PDF_LIMITS.maxFiles} archivos PDF en una operación.`,
    INPUT_SIZE_LIMIT:`Los archivos seleccionados superan ${Math.round(PDF_LIMITS.maxInputBytes/1024**2)} MiB en total.`,
    PAGE_LIMIT:`La selección supera el máximo de ${PDF_LIMITS.maxPages} páginas por operación.`,
    ONE_FILE_ONLY:'Esta herramienta trabaja con un único archivo PDF.',
    INVALID_INPUT:'Revisa los archivos, las páginas o los rangos indicados.',INVALID_PDF:'No se pudo leer el PDF con garantías. El original sigue intacto.',
    UNSUPPORTED_DOCUMENT:'Este PDF contiene una estructura que todavía no podemos conservar. No se ha generado una copia degradada.',
    REPAIR_REQUIRED:'El PDF necesita revisión o reparación y no puede procesarse de forma segura.',
    FORM_CONFLICT:'Los formularios tienen nombres o recursos incompatibles, o se están duplicando sus páginas. No se pueden combinar de forma segura todavía.',
    PARTIAL_FORM:'Un campo del formulario abarca varias páginas. Mantén juntas todas las páginas de ese campo.',
    DESTINATION_REMOVED:'Un enlace apunta a una página excluida. Incluye esa página en la misma salida para conservarlo.',
    DESTINATION_CONFLICT:'Los PDF tienen destinos con el mismo nombre. No se pueden combinar sin resolver esa ambigüedad.',
    DOCUMENT_CONFLICT:'Los PDF tienen preferencias o perfiles de color incompatibles. No podemos conservar ambos en esta operación.',
    VALIDATION_FAILED:'La salida no superó la comprobación de conservación. No se entrega ningún archivo.',
    LIMIT_EXCEEDED:'Esta operación supera su capacidad de archivos, páginas o tamaño.',
    TIMEOUT:'Se alcanzó el límite de tiempo. Prueba con un documento más pequeño.',ABORTED:'Operación cancelada.',
    WORKER_FAILED:'No se pudo iniciar el procesamiento PDF. Inténtalo de nuevo.',UNKNOWN:'No se pudo completar la operación.',
  },
  en: {
    'merge-pdf':'Merge PDF','organize-pdf':'Organize PDF','split-pdf':'Split PDF',
    'merge-pdf-description':'Combine multiple PDFs in the order you choose.',
    'organize-pdf-description':'Reorder, rotate, duplicate, or remove pages from a PDF.',
    'split-pdf-description':'Split a PDF into multiple files by page or range.',
    privacy:'Private on your device',privacyDetail:'Your files are processed only on this device: they are not sent to servers or third parties. This reduces exposure of personal and company data.',drop:'Drop your PDFs here',dropActive:'Drop the PDFs to add them',
    multiple:'You can select multiple PDF files.',single:'Select a single PDF file.',
    addFiles:'Add files',addFile:'Add file',replaceFile:'Change file',choose:'Select PDFs',
    loading:'Checking files…',processing:'Processing…',checking:'Verifying output…',cancel:'Cancel',clear:'Clear',reset:'Reset',generate:'Generate PDF',
    pages:'pages',page:'Page',file:'File',original:'Original',now:'Now',of:'of',up:'Move up',down:'Move down',remove:'Remove file',deletePage:'Delete page',duplicate:'Duplicate',rotate:'Rotate 90°',
    reverse:'Reverse order',all:'Select all',none:'Deselect all',selected:'selected',dragPage:'Drag to reorder',dropHere:'Drop here',
    previous:'Previous',next:'Next',preview:'Thumbnail',previewFailed:'Preview unavailable',
    ranges:'Output files',createRange:'Create range',deleteRange:'Delete range',confirmDeleteRange:'Delete this range? Its pages will become available again.',editRange:'Click to edit',dragReorder:'Drag and drop thumbnails to change their order.',rangeHelp:'Create a range, then click pages on the left to add them.',selectPages:'Click pages to select them.',noRanges:'Create a range to start selecting pages.',extract:'Extract PDF',
    download:'Download',zip:'Download all as ZIP',ready:'Output verified. Your original files are unchanged.',
    FILE_LIMIT:`You can add up to ${PDF_LIMITS.maxFiles} PDF files in one operation.`,
    INPUT_SIZE_LIMIT:`The selected files exceed ${Math.round(PDF_LIMITS.maxInputBytes/1024**2)} MiB in total.`,
    PAGE_LIMIT:`The selection exceeds the ${PDF_LIMITS.maxPages}-page limit per operation.`,
    ONE_FILE_ONLY:'This tool works with a single PDF file.',
    INVALID_INPUT:'Check the files, page selection or ranges.',INVALID_PDF:'The PDF could not be read safely. The original is unchanged.',
    UNSUPPORTED_DOCUMENT:'This PDF contains a structure we cannot preserve yet. No degraded copy was created.',
    REPAIR_REQUIRED:'This PDF needs review or repair and cannot be processed safely.',
    FORM_CONFLICT:'The forms have conflicting names/resources, or their pages are duplicated. This combination is not supported yet.',
    PARTIAL_FORM:'A form field spans multiple pages. Keep all of its pages together.',DESTINATION_REMOVED:'A link targets an excluded page. Include that page in the same output.',
    DOCUMENT_CONFLICT:'The PDFs have conflicting preferences or color profiles.',DESTINATION_CONFLICT:'The PDFs have conflicting named destinations.',VALIDATION_FAILED:'The output failed preservation checks. No file will be delivered.',
    LIMIT_EXCEEDED:'This operation exceeds its file, page, or size capacity.',TIMEOUT:'The time limit was reached. Try a smaller document.',
    ABORTED:'Operation cancelled.',WORKER_FAILED:'PDF processing could not start. Try again.',UNKNOWN:'The operation could not be completed.',
  },
};

let sequence = 0;
function newSplitRange(id,pages=[]) { return {id,color:(id-1)%6,pages}; }
function save(bytes, name, type='application/pdf') { downloadBlob(new Blob([bytes],{type}),name); }
const Icon = ({children}) => <span className="zu-pdf-button-icon" aria-hidden="true">{children}</span>;

function PdfTool({ mode, language='es', workerUrl, previewWorkerUrl }) {
  const copy=COPY[language] || COPY.es;
  const api=useRef(null),controller=useRef(null),generation=useRef(0),previewUrls=useRef(new Map()),input=useRef(null),fileDragDepth=useRef(0),splitSequence=useRef(0);
  const [files,setFiles]=useState([]),[pages,setPages]=useState([]),[splitRangeGroups,setSplitRangeGroups]=useState([]),[activeSplitRange,setActiveSplitRange]=useState(null),[windowIndex,setWindowIndex]=useState(0);
  const [busy,setBusy]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState(''),[result,setResult]=useState(null),[thumbs,setThumbs]=useState({});
  const [drag,setDrag]=useState(null),[dropTarget,setDropTarget]=useState(null),[fileDragActive,setFileDragActive]=useState(false),[rangeDrag,setRangeDrag]=useState(null),[rangeDrop,setRangeDrop]=useState(null),[rangeHover,setRangeHover]=useState(null),[pendingRangeDelete,setPendingRangeDelete]=useState(null);

  useEffect(()=>{
    api.current=createPdfToolsClient({workerUrl});
    return ()=>{generation.current++;controller.current?.abort();api.current?.dispose();for(const url of previewUrls.current.values())URL.revokeObjectURL(url);previewUrls.current.clear();};
  },[workerUrl]);

  const invalidate=()=>{setResult(null);setError('');};
  function clearPreviews() {
    for(const url of previewUrls.current.values())URL.revokeObjectURL(url);
    previewUrls.current.clear();setThumbs({});
  }
  function reset() {
    generation.current++;controller.current?.abort();clearPreviews();fileDragDepth.current=0;splitSequence.current=0;setFileDragActive(false);setFiles([]);setPages([]);setSplitRangeGroups([]);setActiveSplitRange(null);setPendingRangeDelete(null);setResult(null);setError('');setWindowIndex(0);setDrag(null);setDropTarget(null);
    if(input.current) input.current.value='';
  }
  function resetOrganization() {
    if (!files.length) return;
    setPages(Array.from({length:files[0].info.pageCount},(_,index)=>({id:++sequence,index,rotation:0,selected:true})));
    setWindowIndex(0);setDrag(null);setDropTarget(null);invalidate();
  }
  function removeFile(file) {
    for(const [key,url] of previewUrls.current.entries())if(key.startsWith(`${file.id}:`)){URL.revokeObjectURL(url);previewUrls.current.delete(key);}
    setThumbs(current=>Object.fromEntries(Object.entries(current).filter(([key])=>!key.startsWith(`${file.id}:`))));
    setFiles(current=>current.filter(item=>item.id!==file.id));invalidate();
  }
  async function selectFiles(chosen) {
    if(busy||!chosen.length)return;
    const adding=mode==='merge-pdf'&&files.length>0,base=adding?files:[];
    if(mode!=='merge-pdf'&&chosen.length!==1){setError('ONE_FILE_ONLY');return;}
    if(base.length+chosen.length>PDF_LIMITS.maxFiles){setError('FILE_LIMIT');return;}
    if(base.reduce((sum,file)=>sum+file.size,0)+chosen.reduce((sum,file)=>sum+file.size,0)>PDF_LIMITS.maxInputBytes){setError('INPUT_SIZE_LIMIT');return;}
    invalidate();if(!adding){clearPreviews();splitSequence.current=0;setFiles([]);setPages([]);setSplitRangeGroups([]);setActiveSplitRange(null);setPendingRangeDelete(null);setWindowIndex(0);}
    const current=++generation.current,abort=new AbortController();controller.current=abort;setBusy(true);setStage('loading');
    try {
      const loaded=[...base];let totalPages=base.reduce((sum,file)=>sum+file.info.pageCount,0);
      for(const file of chosen){
        const bytes=new Uint8Array(await file.arrayBuffer()),info=await api.current.inspect(bytes,{signal:abort.signal});
        totalPages+=info.pageCount;if(totalPages>PDF_LIMITS.maxPages)throw {code:'PAGE_LIMIT'};
        loaded.push({id:++sequence,name:file.name,bytes,info,size:file.size});
      }
      if(current!==generation.current)return;
      setFiles(loaded);
      if(mode!=='merge-pdf'){
        setPages(Array.from({length:loaded[0].info.pageCount},(_,index)=>({id:++sequence,index,rotation:0,selected:true})));
      }
    }catch(e){if(current===generation.current)setError(e.code || 'UNKNOWN');}
    finally{if(current===generation.current){setBusy(false);setStage('');controller.current=null;}}
  }

  const pageWindow=pages.slice(windowIndex*12,windowIndex*12+12);
  const selectedCount=pages.filter(page=>page.selected).length;
  const displayedSplitRange=rangeHover===null?activeSplitRange:rangeHover;
  const displayedSplitGroup=displayedSplitRange===null?null:splitRangeGroups[displayedSplitRange];
  const splitPreviewIndexes=mode==='split-pdf'&&displayedSplitRange!==null?[...new Set([...pageWindow.map(page=>page.index),...(splitRangeGroups[displayedSplitRange]?.pages||[])])]:pageWindow.map(page=>page.index);
  const wanted=mode==='merge-pdf'?files.map(file=>({file,index:0})):files.length?splitPreviewIndexes.map(index=>({file:files[0],index})):[];
  const previewKey=wanted.map(item=>`${item.file.id}:${item.index}`).join(',');
  useEffect(()=>{
    const abort=new AbortController();let closed=false;
    const pending=wanted.filter(item=>!previewUrls.current.has(`${item.file.id}:${item.index}`));
    void (async()=>{
      if(!pending.length)return;
      const {createPdfPreview}=await import('@zutools/core/pdf-preview');
      for(const file of [...new Set(pending.map(item=>item.file))]){
        let preview;
        try{
          preview=await createPdfPreview(file.bytes,{signal:abort.signal,workerUrl:previewWorkerUrl});
          for(const item of pending.filter(entry=>entry.file===file)){
            if(closed)return;
            const key=`${file.id}:${item.index}`,blob=await preview.renderPage(item.index),url=URL.createObjectURL(blob);
            if(closed){URL.revokeObjectURL(url);return;}
            const old=previewUrls.current.get(key);if(old)URL.revokeObjectURL(old);
            previewUrls.current.set(key,url);setThumbs(current=>({...current,[key]:url}));
          }
        }catch{if(!closed)setThumbs(current=>({...current,...Object.fromEntries(pending.filter(item=>item.file===file).map(item=>[`${file.id}:${item.index}`,false]))}));}
        finally{await preview?.dispose();}
      }
    })().catch(()=>{if(!closed)setThumbs(current=>({...current,...Object.fromEntries(pending.map(item=>[`${item.file.id}:${item.index}`,false]))}));});
    return ()=>{closed=true;abort.abort();};
  },[previewKey,previewWorkerUrl]);

  function reorder(list,from,to,setter){
    if(from===to||from<0||to<0||to>=list.length)return;
    const next=[...list],[item]=next.splice(from,1);next.splice(to,0,item);setter(next);invalidate();
  }
  function finishDrag(){setDrag(null);setDropTarget(null);}
  function isFileDrag(dataTransfer){
    return Array.from(dataTransfer?.types||[]).some(type=>type.toLowerCase()==='files')||
      Array.from(dataTransfer?.items||[]).some(item=>item.kind==='file');
  }
  function enterFileDrop(event){
    if(!isFileDrag(event.dataTransfer))return;
    event.preventDefault();fileDragDepth.current++;setFileDragActive(true);
  }
  function hoverFileDrop(event){
    if(!isFileDrag(event.dataTransfer))return;
    event.preventDefault();event.dataTransfer.dropEffect='copy';setFileDragActive(true);
  }
  function leaveFileDrop(event){
    if(!isFileDrag(event.dataTransfer))return;
    event.preventDefault();fileDragDepth.current=Math.max(0,fileDragDepth.current-1);
    if(fileDragDepth.current===0)setFileDragActive(false);
  }
  function dropFiles(event){
    if(!isFileDrag(event.dataTransfer)&&!event.dataTransfer.files.length)return;
    event.preventDefault();fileDragDepth.current=0;setFileDragActive(false);
    if(event.dataTransfer.files.length)void selectFiles(Array.from(event.dataTransfer.files));
  }
  function updatePage(id,fn){setPages(current=>current.map(page=>page.id===id?fn(page):page));invalidate();}
  function setPageSelected(id, selected) {
    setPages(current=>{
      const index=current.findIndex(page=>page.id===id);
      if(index<0||current[index].selected===selected)return current;
      const next=[...current], [page]=next.splice(index,1), updated={...page,selected};
      if(selected) next.splice(next.filter(item=>item.selected).length,0,updated);
      else next.push(updated);
      return next;
    });
    invalidate();
  }
  function deletePage(id) {
    setPages(current=>current.filter(page=>page.id!==id));
    setWindowIndex(current=>Math.max(0,Math.min(current,Math.ceil((pages.length-1)/12)-1)));
    invalidate();
  }
  function createSplitRange() {
    if(splitRangeGroups.length>=PDF_LIMITS.maxOutputs)return;
    if(!splitRangeGroups.length)splitSequence.current=0;
    const range=newSplitRange(++splitSequence.current);setSplitRangeGroups(current=>[range,...current.map(group=>({...group,pages:[...group.pages]}))]);setRangeHover(null);setActiveSplitRange(0);invalidate();
  }
  function toggleSplitPage(pageIndex) {
    if(activeSplitRange===null){if(!splitRangeGroups.length)splitSequence.current=0;setSplitRangeGroups([newSplitRange(++splitSequence.current,[pageIndex])]);setActiveSplitRange(0);invalidate();return;}
    if(rangeHover!==null&&rangeHover!==activeSplitRange)return;
    setSplitRangeGroups(current=>current.map((group,index)=>{
      if(index!==activeSplitRange)return group;
      return {...group,pages:group.pages.includes(pageIndex)?group.pages.filter(item=>item!==pageIndex):[...group.pages,pageIndex]};
    }));
    invalidate();
  }
  function deleteSplitRange(rangeIndex) {
    setSplitRangeGroups(current=>current.filter((_,index)=>index!==rangeIndex));
    setActiveSplitRange(current=>current===rangeIndex?null:current!==null&&current>rangeIndex?current-1:current);setPendingRangeDelete(null);setRangeHover(null);invalidate();
  }
  function reorderSplitRange(fromIndex,toIndex) {
    if(activeSplitRange===null||fromIndex===toIndex||fromIndex<0||toIndex<0)return;
    setSplitRangeGroups(current=>current.map((group,index)=>{
      if(index!==activeSplitRange||toIndex>=group.pages.length)return group;
      const next=[...group.pages],[page]=next.splice(fromIndex,1);next.splice(toIndex,0,page);return {...group,pages:next};
    }));
    invalidate();
  }
  async function run(){
    if(busy||!files.length)return;invalidate();const current=generation.current,abort=new AbortController();controller.current=abort;setBusy(true);setStage('processing');
    try{
      const options={signal:abort.signal,onProgress:progress=>setStage(progress.phase==='checking-output'?'checking':'processing')};let value;
      if(mode==='merge-pdf')value=await api.current.mergePdf(files.map(file=>file.bytes),options);
      else if(mode==='organize-pdf')value=await api.current.organizePdf(files[0].bytes,pages.filter(page=>page.selected).map(({index,rotation})=>({index,rotation})),options);
      else value=await api.current.splitPdf(files[0].bytes,splitRangeGroups.map(group=>group.pages),{...options,outputNames:splitRangeGroups.map(group=>`split${group.id}.pdf`)});
      if(current===generation.current){
        setResult(value);
        if(value.archive) save(value.archive,'split-pdf.zip','application/zip');
        else if(value.outputs[0]) save(value.outputs[0].bytes,value.outputs[0].name);
      }
    }catch(e){if(current===generation.current)setError(e.code || 'UNKNOWN');}
    finally{if(current===generation.current){setBusy(false);setStage('');controller.current=null;}}
  }
  const thumbnail=(file,index,rotation=0)=>{
    const value=thumbs[`${file.id}:${index}`];
    return <div className="zu-pdf-thumb">{value?<img src={value} alt={`${copy.preview} · ${copy.page} ${index+1}`} style={{transform:`rotate(${rotation}deg)`}}/>:<span>{value===false?copy.previewFailed:`${copy.preview}…`}</span>}</div>;
  };
  const actionDisabled=!files.length||(mode==='organize-pdf'&&!selectedCount)||(mode==='split-pdf'&&(!splitRangeGroups.length||splitRangeGroups.some(group=>!group.pages.length)));
  const statusMessage=error?(copy[error]||copy.UNKNOWN):busy?copy[stage]:result?copy.ready:'';
  const resultsView=result&&<section className="zu-pdf-results" aria-label={copy.download}>{result.archive&&<button type="button" className="mini-action" onClick={()=>save(result.archive,'split-pdf.zip','application/zip')}><Icon><Archive size={17}/></Icon>{copy.zip}</button>}{result.outputs.map(output=><button type="button" key={output.name} onClick={()=>save(output.bytes,output.name)}><Icon><Download size={17}/></Icon>{copy.download} {output.name} · {output.pageCount} {copy.pages}</button>)}</section>;

  return <section className="mini-tool zu-pdf-tool" aria-labelledby={`zu-pdf-title-${mode}`}>
    <header className="zu-pdf-header">
      <div><h2 id={`zu-pdf-title-${mode}`}>{copy[mode]}</h2><p>{copy[`${mode}-description`]}</p></div>
      <span className="zu-pdf-local" tabIndex="0" aria-describedby={`zu-pdf-privacy-${mode}`}><ShieldCheck size={17} aria-hidden="true"/><span>{copy.privacy}</span><span className="zu-pdf-local-info" aria-hidden="true">i</span><span id={`zu-pdf-privacy-${mode}`} role="tooltip" className="zu-pdf-local-tooltip">{copy.privacyDetail}</span></span>
    </header>

    <fieldset disabled={busy}>
      <legend className="zu-pdf-sr">{copy[mode]}</legend>
      <div className={`zu-pdf-drop ${files.length?'has-files':''} ${fileDragActive?'is-active':''}`}
        onDragEnter={enterFileDrop} onDragOver={hoverFileDrop} onDragLeave={leaveFileDrop} onDrop={dropFiles}>
        <span className="zu-pdf-drop-icon"><Upload size={24} aria-hidden="true"/></span>
        <div className="zu-pdf-drop-copy"><strong>{fileDragActive?copy.dropActive:copy.drop}</strong><span>{mode==='merge-pdf'?copy.multiple:copy.single}</span></div>
        <label className="zu-pdf-add-button"><FilePlus2 size={17} aria-hidden="true"/><span>{mode==='merge-pdf'?copy.addFiles:files.length?copy.replaceFile:copy.addFile}</span>
          <input ref={input} className="zu-pdf-sr" type="file" accept="application/pdf,.pdf" multiple={mode==='merge-pdf'} aria-label={copy.choose}
            onChange={event=>{const chosen=Array.from(event.target.files||[]);event.target.value='';void selectFiles(chosen);}}/>
        </label>
      </div>

      {files.length>0&&<div className={`zu-pdf-editor ${mode==='split-pdf'?'zu-pdf-editor-split':''}`}>
        {mode==='merge-pdf'&&<ol className="zu-pdf-files">{files.map((file,index)=><li key={file.id} className={dropTarget===index&&drag?.type==='file'?'is-drop-target':''} draggable
          onDragStart={()=>setDrag({type:'file',index})} onDragOver={event=>{if(drag?.type==='file'){event.preventDefault();setDropTarget(index);}}}
          onDrop={event=>{event.preventDefault();if(drag?.type==='file')reorder(files,drag.index,index,setFiles);finishDrag();}} onDragEnd={finishDrag}>
          <GripVertical className="zu-pdf-grip" size={18} aria-hidden="true"/>{thumbnail(file,0)}
          <div className="zu-pdf-file-info"><strong>{file.name}</strong><small>{file.info.pageCount} {copy.pages} · {formatBytes(file.size)}</small></div>
          <div className="zu-pdf-buttons"><button type="button" title={copy.up} aria-label={`${copy.up} ${file.name}`} disabled={!index} onClick={()=>reorder(files,index,index-1,setFiles)}><ArrowUp size={16} aria-hidden="true"/></button><button type="button" title={copy.down} aria-label={`${copy.down} ${file.name}`} disabled={index===files.length-1} onClick={()=>reorder(files,index,index+1,setFiles)}><ArrowDown size={16} aria-hidden="true"/></button><button type="button" title={copy.remove} aria-label={`${copy.remove} ${file.name}`} onClick={()=>removeFile(file)}><Trash2 size={16} aria-hidden="true"/></button></div>
        </li>)}</ol>}

        {mode!=='merge-pdf'&&<>
          {mode==='organize-pdf'?<div className="zu-pdf-source zu-pdf-organize-source"><div className="zu-pdf-source-info"><strong>{files[0].name}</strong><span>{selectedCount} {copy.selected} / {pages.length} {copy.pages} ({formatBytes(files[0].size)})</span></div><div className="zu-pdf-toolbar"><button type="button" disabled={selectedCount!==pages.length} onClick={()=>{setPages(current=>[...current].reverse());invalidate();}}><Icon><ArrowUpDown size={16}/></Icon>{copy.reverse}</button><button type="button" disabled={selectedCount===pages.length} onClick={()=>{setPages(current=>current.map(page=>({...page,selected:true})));invalidate();}}><Icon><CheckSquare2 size={16}/></Icon>{copy.all}</button><button type="button" disabled={selectedCount===0} onClick={()=>{setPages(current=>current.map(page=>({...page,selected:false})));invalidate();}}><Icon><Square size={16}/></Icon>{copy.none}</button></div></div>:<div className="zu-pdf-source"><strong>{files[0].name}</strong><span>{files[0].info.pageCount} {copy.pages} · {formatBytes(files[0].size)}</span></div>}
          <div className="zu-pdf-pages">{pageWindow.map((page,position)=>{const index=windowIndex*12+position,isTarget=dropTarget===index&&drag?.type==='page',outputPosition=page.selected?pages.slice(0,index).filter(item=>item.selected).length+1:null,rangeOrder=displayedSplitGroup?.pages.indexOf(page.index)??-1,isDisplayedRange=rangeOrder>=0;return <article key={page.id} className={`zu-pdf-page ${page.selected?'':'excluded'} ${isTarget?'is-drop-target':''} ${isDisplayedRange?`is-range range-${displayedSplitGroup.color}`:''} ${isDisplayedRange?'is-active-range':''}`} draggable={mode==='organize-pdf'} role={mode==='split-pdf'?'button':undefined} tabIndex={mode==='split-pdf'?0:undefined}
            aria-label={mode==='split-pdf'?`${copy.page} ${page.index+1}`:undefined} onClick={mode==='split-pdf'?()=>toggleSplitPage(page.index):undefined} onKeyDown={mode==='split-pdf'?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSplitPage(page.index);}}:undefined}
            onDragStart={()=>{if(mode==='organize-pdf')setDrag({type:'page',index});}} onDragOver={event=>{if(drag?.type==='page'){event.preventDefault();setDropTarget(index);}}}
            onDrop={event=>{if(drag?.type==='page'){event.preventDefault();reorder(pages,drag.index,index,setPages);}finishDrag();}} onDragEnd={finishDrag}>
            {mode==='organize-pdf'&&<div className="zu-pdf-page-meta"><label><input type="checkbox" aria-label={`${copy.page} ${page.index+1}`} checked={page.selected} onChange={event=>setPageSelected(page.id,event.target.checked)}/><span>{copy.original} {page.index+1}</span></label>{outputPosition&&<strong>{copy.now} {outputPosition}</strong>}<GripVertical size={17} aria-label={copy.dragPage}/></div>}
            {isTarget&&<div className="zu-pdf-drop-cue"><GripVertical size={18} aria-hidden="true"/>{copy.dropHere}</div>}
            {thumbnail(files[0],page.index,page.rotation)}
            {mode==='split-pdf'&&isDisplayedRange&&<strong className="zu-pdf-split-order">{rangeOrder+1}</strong>}{mode!=='organize-pdf'&&<span className="zu-pdf-page-number">{copy.page} {page.index+1}</span>}
            {mode==='organize-pdf'&&<div className="zu-pdf-buttons"><button type="button" title={copy.up} aria-label={`${copy.up} ${index+1}`} disabled={!index} onClick={()=>reorder(pages,index,index-1,setPages)}><ArrowUp size={16} aria-hidden="true"/></button><button type="button" title={copy.down} aria-label={`${copy.down} ${index+1}`} disabled={index===pages.length-1} onClick={()=>reorder(pages,index,index+1,setPages)}><ArrowDown size={16} aria-hidden="true"/></button><button type="button" title={copy.rotate} aria-label={`${copy.rotate} · ${index+1}`} onClick={()=>updatePage(page.id,current=>({...current,rotation:(current.rotation+90)%360}))}><RotateCw size={16} aria-hidden="true"/></button><button type="button" title={copy.duplicate} aria-label={`${copy.duplicate} · ${index+1}`} disabled={pages.length>=PDF_LIMITS.maxPages} onClick={()=>{setPages(current=>[...current.slice(0,index+1),{...page,id:++sequence},...current.slice(index+1)]);invalidate();}}><CopyPlus size={16} aria-hidden="true"/></button><button type="button" className="zu-pdf-delete" title={copy.deletePage} aria-label={`${copy.deletePage} · ${index+1}`} onClick={()=>deletePage(page.id)}><Trash2 size={16} aria-hidden="true"/></button></div>}
          </article>;})}</div>
          {pages.length>12&&<div className="zu-pdf-pagination"><button type="button" aria-label={copy.previous} disabled={!windowIndex} onClick={()=>setWindowIndex(value=>value-1)}><ChevronLeft size={16} aria-hidden="true"/></button><span>{windowIndex+1} {copy.of} {Math.ceil(pages.length/12)}</span><button type="button" aria-label={copy.next} disabled={(windowIndex+1)*12>=pages.length} onClick={()=>setWindowIndex(value=>value+1)}><ChevronRight size={16} aria-hidden="true"/></button></div>}
          {mode==='split-pdf'&&<aside className="zu-pdf-ranges"><div className="zu-pdf-range-heading"><div><strong>{copy.ranges}</strong><small>{copy.rangeHelp}</small></div><button type="button" className="zu-pdf-create-range" disabled={splitRangeGroups.length>=PDF_LIMITS.maxOutputs} onClick={createSplitRange}><Icon><Plus size={16}/></Icon>{copy.createRange}</button></div>{splitRangeGroups.length?<div className="zu-pdf-range-list">{splitRangeGroups.map((group,rangeIndex)=>{const isActive=activeSplitRange===rangeIndex,outputName=`split${group.id}.pdf`;return <div key={group.id} className={`zu-pdf-range-item range-${group.color} ${isActive?'is-active':''}`} onMouseEnter={()=>setRangeHover(rangeIndex)} onMouseLeave={()=>setRangeHover(null)}><div className="zu-pdf-range-title"><button type="button" onClick={()=>setActiveSplitRange(rangeIndex)}><i aria-hidden="true"/><span>{outputName} · {group.pages.length} {copy.pages}</span></button>{isActive&&<button type="button" className="zu-pdf-range-delete" aria-label={`${copy.deleteRange} ${outputName}`} onClick={()=>setPendingRangeDelete(rangeIndex)}><Trash2 size={19}/></button>}</div>{isActive&&<div className="zu-pdf-range-content">{group.pages.length?<><p className="zu-pdf-range-reorder"><GripVertical size={15} aria-hidden="true"/>{copy.dragReorder}</p><div className="zu-pdf-range-thumbnails">{group.pages.map((pageIndex,pageOrder)=><div key={pageIndex} className={`zu-pdf-range-thumbnail ${rangeDrop===pageOrder?'is-drop-target':''}`} draggable onDragStart={()=>setRangeDrag(pageOrder)} onDragEnter={event=>{if(rangeDrag!==null){event.preventDefault();setRangeDrop(pageOrder);}}} onDragOver={event=>{if(rangeDrag!==null){event.preventDefault();setRangeDrop(pageOrder);}}} onDrop={event=>{event.preventDefault();reorderSplitRange(rangeDrag,pageOrder);setRangeDrag(null);setRangeDrop(null);}} onDragEnd={()=>{setRangeDrag(null);setRangeDrop(null);}}><GripVertical className="zu-pdf-range-grip" size={14} aria-hidden="true"/><span>{pageOrder+1}</span>{thumbnail(files[0],pageIndex)}</div>)}</div></>:<p>{copy.selectPages}</p>}</div>}{!isActive&&<div className="zu-pdf-range-edit-overlay"><button type="button" aria-label={`${copy.editRange} ${outputName}`} onClick={()=>{setRangeHover(null);setActiveSplitRange(rangeIndex);}}><Pencil size={19} aria-hidden="true"/></button><button type="button" className="zu-pdf-range-overlay-delete" aria-label={`${copy.deleteRange} ${outputName}`} onClick={()=>setPendingRangeDelete(rangeIndex)}><Trash2 size={19} aria-hidden="true"/></button></div>}</div>;})}</div>:<p className="zu-pdf-no-ranges">{copy.noRanges}</p>}{pendingRangeDelete!==null&&<div className="zu-pdf-range-confirm" role="alertdialog" aria-modal="true" aria-label={copy.deleteRange}><strong>{copy.deleteRange}</strong><p>{copy.confirmDeleteRange}</p><div><button type="button" onClick={()=>setPendingRangeDelete(null)}>{copy.cancel}</button><button type="button" className="zu-pdf-confirm-delete" onClick={()=>deleteSplitRange(pendingRangeDelete)}><Trash2 size={16}/>{copy.deleteRange}</button></div></div>}<div className="zu-pdf-split-actions"><button type="button" className="mini-action" disabled={busy||actionDisabled} onClick={()=>void run()}><Icon><Download size={18}/></Icon>{copy.extract}</button>{busy&&<button type="button" className="zu-pdf-cancel" onClick={()=>controller.current?.abort()}><Icon><X size={17}/></Icon>{copy.cancel}</button>}</div><p role="status" aria-live="polite" className={error?'zu-pdf-error':''}>{statusMessage}</p>{resultsView}</aside>}
        </>}
      </div>}
    </fieldset>

    {mode!=='split-pdf'&&<div className="zu-pdf-actions">
      <div><button type="button" disabled={busy||!files.length} onClick={mode==='organize-pdf'?resetOrganization:reset}><Icon><RotateCcw size={17}/></Icon>{mode==='organize-pdf'?copy.reset:copy.clear}</button><button type="button" className="mini-action" disabled={busy||actionDisabled} onClick={()=>void run()}><Icon><Download size={18}/></Icon>{copy.generate}</button>{busy&&<button type="button" className="zu-pdf-cancel" onClick={()=>controller.current?.abort()}><Icon><X size={17}/></Icon>{copy.cancel}</button>}</div>
      <p role="status" aria-live="polite" className={error?'zu-pdf-error':''}>{statusMessage}</p>
    </div>}

    {mode!=='split-pdf'&&resultsView}
  </section>;
}

/** @typedef {{language?: 'es'|'en', workerUrl?: string|URL, previewWorkerUrl?: string|URL}} PdfToolProps */
/** @param {PdfToolProps} props */
export function MergePdf(props){return <PdfTool {...props} mode="merge-pdf"/>;}
/** @param {PdfToolProps} props */
export function OrganizePdf(props){return <PdfTool {...props} mode="organize-pdf"/>;}
/** @param {PdfToolProps} props */
export function SplitPdf(props){return <PdfTool {...props} mode="split-pdf"/>;}

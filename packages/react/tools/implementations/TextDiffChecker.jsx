import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, Check, CircleMinus,
  CirclePlus, Columns2, Copy, Eraser, FileUp, GitCompareArrows, LoaderCircle, Rows3,
} from 'lucide-react';
import { compareText, countTextCharacters } from '@zutools/core/text-diff';

const COPY_TEXT = {
  es: {
    original: 'Texto original', revised: 'Texto nuevo', originalPlaceholder: 'Pega aquí la primera versión…', revisedPlaceholder: 'Pega aquí la segunda versión…',
    granularity: 'Comparar por', smart: 'Smart', smartHelp: 'Elige el resaltado más claro para cada cambio: caracteres concretos cuando encaja mejor y palabras completas cuando se entiende mejor.', words: 'Palabras', lines: 'Líneas', characters: 'Caracteres', ignoreCase: 'Ignorar mayúsculas', ignoreWhitespace: 'Ocultar cambios de espacios',
    live: 'Comparar en tiempo real', hideUnchanged: 'Ocultar líneas sin cambios', wrap: 'Ajustar líneas', view: 'Vista', split: 'Dividida', unified: 'Unificada',
    compare: 'Comparar textos', comparing: 'Comparando…', loading: 'Cargando…', swap: 'Intercambiar', clear: 'Limpiar', result: 'Diferencias', identical: 'Los textos son iguales con estas opciones.',
    empty: 'Añade texto en cualquiera de las dos columnas para compararlos.', limit: 'La comparación es demasiado compleja. Prueba por líneas o con textos más pequeños.',
    load: 'Cargar archivo', copy: 'Copiar', copied: 'Copiado', previous: 'Cambio anterior', next: 'Cambio siguiente', previousShort: 'Anterior', nextShort: 'Siguiente', useOriginal: 'Usar original', useRevised: 'Usar nuevo', change: 'Cambio', of: 'de',
    line: 'línea', linePlural: 'líneas', character: 'carácter', characterPlural: 'caracteres', additions: 'adiciones', removals: 'eliminaciones', total: 'Total', added: 'Añadidos', removed: 'Eliminados', fileTooLarge: 'El archivo supera el límite de 5 MB.', readError: 'No se pudo completar la acción.',
  },
  en: {
    original: 'Original text', revised: 'New text', originalPlaceholder: 'Paste the first version here…', revisedPlaceholder: 'Paste the second version here…',
    granularity: 'Compare by', smart: 'Smart', smartHelp: 'Picks the clearest highlight for each change: single characters where character level fits, and whole words where word level fits.', words: 'Words', lines: 'Lines', characters: 'Characters', ignoreCase: 'Ignore case', ignoreWhitespace: 'Hide whitespace changes',
    live: 'Compare in real time', hideUnchanged: 'Hide unchanged lines', wrap: 'Wrap lines', view: 'View', split: 'Split', unified: 'Unified',
    compare: 'Compare texts', comparing: 'Comparing…', loading: 'Loading…', swap: 'Swap', clear: 'Clear', result: 'Differences', identical: 'The texts are identical with these options.',
    empty: 'Add text to either column to compare them.', limit: 'The comparison is too complex. Try comparing by lines or use smaller texts.',
    load: 'Load file', copy: 'Copy', copied: 'Copied', previous: 'Previous change', next: 'Next change', previousShort: 'Previous', nextShort: 'Next', useOriginal: 'Use original', useRevised: 'Use new', change: 'Change', of: 'of',
    line: 'line', linePlural: 'lines', character: 'character', characterPlural: 'characters', additions: 'additions', removals: 'removals', total: 'Total', added: 'Added', removed: 'Removed', fileTooLarge: 'The file exceeds the 5 MB limit.', readError: 'The action could not be completed.',
  },
};

const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;

function yieldForPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

function Segments({ segments }) {
  return segments.map((segment, index) => <span key={`${index}-${segment.type}`} className={segment.type}>{segment.value}</span>);
}

function SplitLine({ side, tone }) {
  return <div className={`text-diff-code-line ${tone || ''} ${side ? '' : 'empty'}`}>
    <span className="text-diff-line-number">{side?.number || ''}</span>
    <code>{side && <Segments segments={side.segments}/>}</code>
  </div>;
}

function UnifiedLine({ beforeNumber, afterNumber, segments, tone }) {
  return <div className={`text-diff-code-line unified-line ${tone || ''}`}>
    <span className="text-diff-line-number">{beforeNumber || ''}</span>
    <span className="text-diff-line-number">{afterNumber || ''}</span>
    <code><Segments segments={segments}/></code>
  </div>;
}

function countLabel(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function editorTextMetrics(value, locale) {
  let lineCount = value ? 1 : 0;
  if (value) for (const _lineBreak of value.matchAll(/\r\n|\n|\r/g)) lineCount += 1;
  return {
    lines: lineCount,
    characters: countTextCharacters(value, locale),
    lineNumbers: Array.from({ length: Math.max(1, lineCount) }, (_, index) => index + 1),
  };
}

function percentage(value, total) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';
}

function highlightedCharacterCount(result, kind, locale) {
  const side = kind === 'delete' ? 'left' : 'right';
  return result.rows.reduce((total, row) => total + (row[side]?.segments || [])
    .filter((segment) => segment.type === kind)
    .reduce((rowTotal, segment) => rowTotal + countTextCharacters(segment.value, locale), 0), 0);
}

function StatsBadge({ kind, result, copy, characterCount }) {
  const removed = kind === 'delete';
  const lineCount = removed ? result.stats.removedLines : result.stats.addedLines;
  const totals = removed ? result.stats.before : result.stats.after;
  const label = `${lineCount} ${removed ? copy.removals : copy.additions}`;
  const Icon = removed ? CircleMinus : CirclePlus;
  const sign = removed ? '−' : '+';
  const tooltipId = `text-diff-${kind}-stats`;
  return <span className={`text-diff-stat ${kind}`}>
    <button type="button" aria-label={label} aria-describedby={tooltipId}><Icon size={17}/><span>{label}</span></button>
    <span id={tooltipId} className="text-diff-stat-popover" role="tooltip">
      <strong>{copy.linePlural}</strong>
      <span><em>{copy.total}</em><b>{totals.lines}</b></span>
      <span><em>{removed ? copy.removed : copy.added}</em><b>{sign}{percentage(lineCount, totals.lines)} <small>{lineCount}</small></b></span>
      <hr/>
      <strong>{copy.characterPlural}</strong>
      <span><em>{copy.total}</em><b>{totals.characters}</b></span>
      <span><em>{removed ? copy.removed : copy.added}</em><b>{sign}{percentage(characterCount, totals.characters)} <small>{characterCount}</small></b></span>
    </span>
  </span>;
}

const DiffRow = React.memo(function DiffRow({ row, active, layout, registerRef }) {
  const ref = row.changeIndex === null ? undefined : (node) => registerRef(row.changeIndex, node);
  if (layout === 'split') {
    return <div ref={ref} data-change-index={row.changeIndex ?? undefined} className={`text-diff-split-row ${active ? 'active-change' : ''}`}>
      <SplitLine side={row.left} tone={row.type === 'equal' ? '' : 'delete-line'}/>
      <SplitLine side={row.right} tone={row.type === 'equal' ? '' : 'insert-line'}/>
    </div>;
  }
  const lines = [];
  if (row.type === 'equal') {
    lines.push(<UnifiedLine key="equal" beforeNumber={row.left?.number} afterNumber={row.right?.number} segments={row.right?.segments || row.left?.segments || []}/>);
  } else {
    if (row.left) lines.push(<UnifiedLine key="delete" beforeNumber={row.left.number} segments={row.left.segments} tone="delete-line"/>);
    if (row.right) lines.push(<UnifiedLine key="insert" afterNumber={row.right.number} segments={row.right.segments} tone="insert-line"/>);
  }
  return <div ref={ref} data-change-index={row.changeIndex ?? undefined} className={`text-diff-unified-row ${active ? 'active-change' : ''}`}>{lines}</div>;
});

const SplitPaneRow = React.memo(function SplitPaneRow({ row, side, active, registerRef }) {
  const ref = side === 'left' && row.changeIndex !== null
    ? (node) => registerRef(row.changeIndex, node)
    : undefined;
  const tone = row.type === 'equal' ? '' : side === 'left' ? 'delete-line' : 'insert-line';
  return <div ref={ref} data-change-index={row.changeIndex ?? undefined} className={`text-diff-pane-row ${active ? 'active-change' : ''}`}>
    <SplitLine side={row[side]} tone={tone}/>
  </div>;
});

export default function TextDiffChecker({ language = 'es' }) {
  const copy = COPY_TEXT[language] || COPY_TEXT.es;
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [granularity, setGranularity] = useState('smart');
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [live, setLive] = useState(false);
  const [hideUnchanged, setHideUnchanged] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [layout, setLayout] = useState('split');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [activeChange, setActiveChange] = useState(0);
  const [swapMotion, setSwapMotion] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [loadingFile, setLoadingFile] = useState('');
  const changeRefs = useRef(new Map());
  const swapTimer = useRef(null);
  const comparisonWorker = useRef(null);
  const rejectComparison = useRef(null);
  const comparisonTask = useRef(0);
  const syncingSplitScroll = useRef(false);
  const registerChangeRef = useCallback((index, node) => {
    if (node) changeRefs.current.set(index, node);
    else changeRefs.current.delete(index);
  }, []);
  const compareInWorker = useCallback((beforeValue, afterValue, options) => {
    if (typeof Worker === 'undefined') return Promise.resolve(compareText(beforeValue, afterValue, options));
    rejectComparison.current?.(Object.assign(new Error('Comparison superseded.'), { name: 'AbortError' }));
    comparisonWorker.current?.terminate();
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../text-diff.worker.js', import.meta.url), { type: 'module' });
      comparisonWorker.current = worker;
      rejectComparison.current = reject;
      const finish = () => {
        worker.terminate();
        if (comparisonWorker.current === worker) comparisonWorker.current = null;
        if (rejectComparison.current === reject) rejectComparison.current = null;
      };
      worker.addEventListener('message', ({ data }) => {
        finish();
        if (data.error) {
          const error = new Error(data.error.message);
          error.name = data.error.name;
          error.code = data.error.code;
          reject(error);
        } else resolve(data.result);
      }, { once: true });
      worker.addEventListener('error', (event) => {
        finish();
        reject(new Error(event.message || copy.readError));
      }, { once: true });
      worker.postMessage({ before: beforeValue, after: afterValue, options });
    });
  }, [copy.readError]);

  const resetResult = () => { setResult(null); setError(''); };
  const execute = async () => {
    const task = ++comparisonTask.current;
    setIsComparing(true);
    await yieldForPaint();
    try {
      if (wrapLines && (/[^\r\n]{20000}/.test(before) || /[^\r\n]{20000}/.test(after))) setWrapLines(false);
      const nextResult = await compareInWorker(before, after, { granularity, ignoreCase, ignoreWhitespace, locale: language });
      if (task !== comparisonTask.current) return;
      setResult(nextResult);
      setActiveChange(0);
      setError('');
    } catch (currentError) {
      if (currentError.name === 'AbortError') return;
      setResult(null);
      setError(currentError.code === 'TEXT_DIFF_LIMIT' ? copy.limit : currentError.message);
    } finally {
      if (task === comparisonTask.current) setIsComparing(false);
    }
  };

  useEffect(() => {
    if (!live) return undefined;
    if (!before && !after) { resetResult(); return undefined; }
    const timer = setTimeout(execute, 180);
    return () => clearTimeout(timer);
  }, [live, before, after, granularity, ignoreCase, ignoreWhitespace, language]);

  useEffect(() => () => {
    clearTimeout(swapTimer.current);
    comparisonWorker.current?.terminate();
  }, []);

  const rows = useMemo(() => {
    let changeIndex = -1;
    return (result?.rows || []).map((row, rowIndex) => {
      if (row.type !== 'equal') changeIndex += 1;
      return { ...row, rowIndex, changeIndex: row.type === 'equal' ? null : changeIndex };
    });
  }, [result]);
  const changeCount = rows.reduce((total, row) => total + (row.changeIndex === null ? 0 : 1), 0);
  const visibleRows = useMemo(() => hideUnchanged ? rows.filter((row) => row.type !== 'equal') : rows, [hideUnchanged, rows]);
  const highlightedCharacters = useMemo(() => result ? {
    delete: highlightedCharacterCount(result, 'delete', language),
    insert: highlightedCharacterCount(result, 'insert', language),
  } : { delete: 0, insert: 0 }, [result, language]);
  const editorMetrics = useMemo(() => ({
    before: editorTextMetrics(before, language),
    after: editorTextMetrics(after, language),
  }), [before, after, language]);

  const updateComparisonOption = (setter, value) => {
    setter(value);
    if (!live) resetResult();
  };
  const updateText = (setter, value) => {
    setter(value);
    if (!live) resetResult();
  };
  const swap = () => {
    if (swapMotion) return;
    setSwapMotion(true);
    swapTimer.current = setTimeout(() => {
      setBefore(after);
      setAfter(before);
      if (!live) resetResult();
      setSwapMotion(false);
    }, 180);
  };
  const clear = () => {
    setBefore('');
    setAfter('');
    resetResult();
  };
  const copyValue = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((current) => current === key ? '' : current), 1400);
    } catch {
      setError(copy.readError);
    }
  };
  const openFile = async (event, setter) => {
    const file = event.target.files?.[0];
    const key = event.target.dataset.editor;
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_TEXT_FILE_BYTES) {
      setError(copy.fileTooLarge);
      return;
    }
    setLoadingFile(key);
    await yieldForPaint();
    try {
      updateText(setter, await file.text());
      setError('');
      await yieldForPaint();
    } catch {
      setError(copy.readError);
    } finally {
      setLoadingFile('');
    }
  };
  const goToChange = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= changeCount) return;
    setActiveChange(nextIndex);
    requestAnimationFrame(() => {
      const element = changeRefs.current.get(nextIndex);
      const container = element?.closest('.text-diff-pane, .text-diff-code');
      if (!element || !container) return;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const elementTop = elementRect.top - containerRect.top + container.scrollTop;
      const top = elementTop - ((container.clientHeight - elementRect.height) / 2);
      const targets = container.classList.contains('text-diff-pane')
        ? container.parentElement.querySelectorAll('.text-diff-pane')
        : [container];
      for (const target of targets) target.scrollTo({ top, behavior: 'smooth' });
    });
  };
  const syncSplitScroll = useCallback((event) => {
    if (syncingSplitScroll.current) return;
    syncingSplitScroll.current = true;
    const source = event.currentTarget;
    for (const pane of source.parentElement.querySelectorAll('.text-diff-pane')) {
      if (pane !== source) {
        pane.scrollTop = source.scrollTop;
        pane.scrollLeft = source.scrollLeft;
      }
    }
    requestAnimationFrame(() => { syncingSplitScroll.current = false; });
  }, []);

  const applyActiveChange = async (sourceSide) => {
    const row = rows.find((current) => current.changeIndex === activeChange);
    if (!row) return;
    const targetSide = sourceSide === 'left' ? 'right' : 'left';
    const targetText = targetSide === 'left' ? before : after;
    const lineBreak = targetText.match(/\r\n|\n|\r/)?.[0] || '\n';
    const targetLines = targetText ? targetText.split(/\r\n|\n|\r/) : [];
    const targetIndex = rows
      .slice(0, row.rowIndex)
      .reduce((total, current) => total + (current[targetSide] ? 1 : 0), 0);
    const replacement = row[sourceSide]
      ? [row[sourceSide].segments.map((segment) => segment.value).join('')]
      : [];
    targetLines.splice(targetIndex, row[targetSide] ? 1 : 0, ...replacement);
    const nextBefore = targetSide === 'left' ? targetLines.join(lineBreak) : before;
    const nextAfter = targetSide === 'right' ? targetLines.join(lineBreak) : after;

    const task = ++comparisonTask.current;
    setIsComparing(true);
    await yieldForPaint();
    try {
      if (wrapLines && (/[^\r\n]{20000}/.test(nextBefore) || /[^\r\n]{20000}/.test(nextAfter))) setWrapLines(false);
      const nextResult = await compareInWorker(nextBefore, nextAfter, { granularity, ignoreCase, ignoreWhitespace, locale: language });
      if (task !== comparisonTask.current) return;
      setBefore(nextBefore);
      setAfter(nextAfter);
      setResult(nextResult);
      setError('');
      const nextChangeCount = nextResult.rows.filter((current) => current.type !== 'equal').length;
      setActiveChange(Math.min(activeChange, Math.max(0, nextChangeCount - 1)));
    } catch (currentError) {
      if (currentError.name === 'AbortError') return;
      setError(currentError.code === 'TEXT_DIFF_LIMIT' ? copy.limit : currentError.message);
    } finally {
      if (task === comparisonTask.current) setIsComparing(false);
    }
  };

  return <div className="mini-tool text-diff-tool">
    <div className="mini-toolbar text-diff-toolbar">
      <div className="text-diff-segmented" aria-label={copy.view}>
        <button type="button" className={layout === 'split' ? 'active' : ''} aria-pressed={layout === 'split'} onClick={() => setLayout('split')}><Columns2 size={15}/>{copy.split}</button>
        <button type="button" className={layout === 'unified' ? 'active' : ''} aria-pressed={layout === 'unified'} onClick={() => setLayout('unified')}><Rows3 size={15}/>{copy.unified}</button>
      </div>
      <label className="mini-field compact" title={granularity === 'smart' ? copy.smartHelp : undefined}><span>{copy.granularity}</span><select value={granularity} aria-description={granularity === 'smart' ? copy.smartHelp : undefined} onChange={(event) => updateComparisonOption(setGranularity, event.target.value)}><option value="smart">{copy.smart}</option><option value="word">{copy.words}</option><option value="line">{copy.lines}</option><option value="character">{copy.characters}</option></select></label>
      <div className="text-diff-primary-actions">
        <button type="button" className="mini-action secondary" disabled={swapMotion} onClick={swap}><ArrowLeftRight size={16}/>{copy.swap}</button>
        <button type="button" className="mini-action secondary" disabled={!before && !after} onClick={clear}><Eraser size={16}/>{copy.clear}</button>
        <button type="button" className={`mini-action ${isComparing ? 'is-loading' : ''}`} disabled={(!before && !after) || isComparing} onClick={execute}>{isComparing ? <LoaderCircle size={16}/> : <GitCompareArrows size={16}/>} {isComparing ? copy.comparing : copy.compare}</button>
      </div>
    </div>

    <div className={`text-diff-editors ${swapMotion ? 'is-swapping' : ''}`}>
      {[
        { key: 'before', title: copy.original, value: before, setter: setBefore, placeholder: copy.originalPlaceholder, metrics: editorMetrics.before },
        { key: 'after', title: copy.revised, value: after, setter: setAfter, placeholder: copy.revisedPlaceholder, metrics: editorMetrics.after },
      ].map((editor) => <div className="mini-editor text-diff-editor" key={editor.key}>
        <span className="text-diff-editor-header"><strong>{editor.title}</strong><span className="text-diff-editor-actions">
          <span className="text-diff-input-stats">{countLabel(editor.metrics.lines, copy.line, copy.linePlural)} · {countLabel(editor.metrics.characters, copy.character, copy.characterPlural)}</span>
          <label className={`mini-action secondary file-action ${loadingFile === editor.key ? 'is-loading' : ''}`}>{loadingFile === editor.key ? <LoaderCircle size={16}/> : <FileUp size={16}/>} {loadingFile === editor.key ? copy.loading : copy.load}<input data-editor={editor.key} type="file" accept="text/*,.txt,.md,.json,.csv,.xml,.yaml,.yml,.js,.ts,.css,.html,.log" disabled={Boolean(loadingFile)} onChange={(event) => openFile(event, editor.setter)}/></label>
          <button type="button" className="mini-action secondary icon-action" aria-label={copied === editor.key ? copy.copied : copy.copy} title={copied === editor.key ? copy.copied : copy.copy} disabled={!editor.value} onClick={(event) => { event.preventDefault(); copyValue(editor.key, editor.value); }}>{copied === editor.key ? <Check size={16}/> : <Copy size={16}/>}</button>
        </span></span>
        <div className="text-diff-input-code">
          <span className="text-diff-input-gutter" aria-hidden="true"><span>{editor.metrics.lineNumbers.map((number) => <i key={number}>{number}</i>)}</span></span>
          <textarea aria-label={editor.title} value={editor.value} wrap="off" onScroll={(event) => event.currentTarget.parentElement.style.setProperty('--editor-scroll', `${-event.currentTarget.scrollTop}px`)} onChange={(event) => updateText(editor.setter, event.target.value)} placeholder={editor.placeholder} spellCheck="false"/>
        </div>
      </div>)}
    </div>

    {error && <p className="mini-message error" role="alert">{error}</p>}
    <section className={`text-diff-result ${wrapLines ? 'wrap-lines' : 'no-wrap'}`} aria-live="polite" aria-busy={isComparing} aria-label={copy.result}>
      <header className="text-diff-result-header">
        {(!result || !result.identical) && <div><strong>{copy.result}</strong>{result && <div className="text-diff-summary">
          <StatsBadge kind="delete" result={result} copy={copy} characterCount={highlightedCharacters.delete}/>
          <StatsBadge kind="insert" result={result} copy={copy} characterCount={highlightedCharacters.insert}/>
        </div>}</div>}
        <div className="text-diff-result-options">
          <label className="text-diff-option"><input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)}/><span>{copy.live}</span></label>
          <label className="text-diff-option"><input type="checkbox" checked={ignoreCase} onChange={(event) => updateComparisonOption(setIgnoreCase, event.target.checked)}/><span>{copy.ignoreCase}</span></label>
          <label className="text-diff-option"><input type="checkbox" checked={ignoreWhitespace} disabled={granularity === 'character'} onChange={(event) => updateComparisonOption(setIgnoreWhitespace, event.target.checked)}/><span>{copy.ignoreWhitespace}</span></label>
          <label className="text-diff-option"><input type="checkbox" checked={hideUnchanged} onChange={(event) => setHideUnchanged(event.target.checked)}/><span>{copy.hideUnchanged}</span></label>
          <label className="text-diff-option"><input type="checkbox" checked={wrapLines} onChange={(event) => setWrapLines(event.target.checked)}/><span>{copy.wrap}</span></label>
        </div>
      </header>
      {!result ? <p className="text-diff-empty">{copy.empty}</p> : result.identical ? <p className="text-diff-identical">{copy.identical}</p> : <>
        <nav className="text-diff-change-nav" aria-label={copy.change}>
          <div className="text-diff-change-navigation">
            <strong>{copy.change} {activeChange + 1} {copy.of} {changeCount}</strong>
            <button type="button" className="mini-action secondary" aria-label={copy.previous} disabled={isComparing || activeChange <= 0} onClick={() => goToChange(activeChange - 1)}><ArrowUp size={15}/>{copy.previousShort}</button>
            <button type="button" className="mini-action secondary" aria-label={copy.next} disabled={isComparing || activeChange >= changeCount - 1} onClick={() => goToChange(activeChange + 1)}><ArrowDown size={15}/>{copy.nextShort}</button>
          </div>
          <div className="text-diff-merge-actions">
            <button type="button" className="mini-action use-original" disabled={isComparing} onClick={() => applyActiveChange('left')}>{copy.useOriginal}<ArrowRight size={15}/></button>
            <button type="button" className="mini-action use-revised" disabled={isComparing} onClick={() => applyActiveChange('right')}><ArrowLeft size={15}/>{copy.useRevised}</button>
          </div>
        </nav>
        {layout === 'split' && <div className="text-diff-column-headings"><span>{copy.original}</span><span>{copy.revised}</span></div>}
        {layout === 'split' && !wrapLines ? <div className="text-diff-code split split-panes" key="split-no-wrap">
          {['left', 'right'].map((side) => <div className={`text-diff-pane ${side}`} key={side} onScroll={syncSplitScroll}><div className="text-diff-pane-lines">
            {visibleRows.map((row) => <SplitPaneRow key={row.rowIndex} row={row} side={side} active={row.changeIndex === activeChange && row.changeIndex !== null} registerRef={registerChangeRef}/>)}
          </div></div>)}
        </div> : <div className={`text-diff-code ${layout}`} key={`${layout}-${wrapLines ? 'wrap' : 'no-wrap'}`}>
          {layout === 'unified' ? <div className="text-diff-unified-lines">{visibleRows.map((row) => <DiffRow key={row.rowIndex} row={row} active={row.changeIndex === activeChange && row.changeIndex !== null} layout={layout} registerRef={registerChangeRef}/>)}</div> : visibleRows.map((row) => <DiffRow key={row.rowIndex} row={row} active={row.changeIndex === activeChange && row.changeIndex !== null} layout={layout} registerRef={registerChangeRef}/>)}
        </div>}
      </>}
    </section>
  </div>;
}

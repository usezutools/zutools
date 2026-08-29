import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  Check,
  Clipboard,
  Download,
  Eraser,
  FileUp,
  Minimize2,
  Play,
  WandSparkles,
} from 'lucide-react';
import {
  arrayBufferToBase64,
  base64ToBytes,
  base64ToUtf8,
  utf8ToBase64,
} from '@zutools/core/base64';
import { csvToObjects, objectsToCsv } from '@zutools/core/csv';
import { formatJson, minifyJson } from '@zutools/core/json';
import { countWords, transformText } from '@zutools/core/text';
import {
  copyText,
  downloadBlob,
  downloadText,
  formatBytes,
  safeFilename,
  stripExtension,
} from './shared';

const COPY = {
  es: {
    input: 'Entrada', output: 'Resultado', pasteJson: 'Pega aquí tu JSON…',
    format: 'Formatear', minify: 'Minificar', validate: 'Validar', clear: 'Limpiar',
    copy: 'Copiar', copied: 'Copiado', download: 'Descargar', validJson: 'JSON válido',
    indentation: 'Sangría', spaces: 'espacios', convert: 'Convertir', direction: 'Dirección',
    delimiter: 'Separador', comma: 'Coma', semicolon: 'Punto y coma', tab: 'Tabulador',
    csvPlaceholder: 'nombre,email\nAna,ana@ejemplo.com',
    jsonArrayPlaceholder: '[{"nombre":"Ana","email":"ana@ejemplo.com"}]',
    uploadJson: 'Cargar JSON', uploadCsv: 'Cargar CSV', fileLoaded: 'Archivo cargado',
    csvEscaping: 'Las comillas internas de arrays y objetos se duplican según el estándar CSV. Es correcto y permite conservar el valor completo en una celda.',
    inferTypes: 'Recuperar tipos JSON', inferTypesHelp: 'Convierte números, booleanos, null, arrays y objetos; conserva identificadores con ceros iniciales como texto.',
    text: 'Texto', file: 'Archivo', encode: 'Codificar', decode: 'Decodificar',
    base64Placeholder: 'Escribe texto o pega una cadena Base64…', selectFile: 'Seleccionar archivo',
    fileReady: 'Archivo preparado', includeDataUri: 'Incluir prefijo Data URI',
    downloadDecoded: 'Descargar archivo decodificado', transform: 'Transformación',
    sourceText: 'Texto original', resultText: 'Texto transformado', textPlaceholder: 'Escribe o pega el texto…',
    uppercase: 'MAYÚSCULAS', lowercase: 'minúsculas', title: 'Tipo Título', sentence: 'Tipo frase',
    camel: 'camelCase', snake: 'snake_case', kebab: 'kebab-case', trim: 'Limpiar espacios',
    chars: 'caracteres', words: 'palabras', emptyResult: 'El resultado aparecerá aquí.',
  },
  en: {
    input: 'Input', output: 'Result', pasteJson: 'Paste JSON here…',
    format: 'Format', minify: 'Minify', validate: 'Validate', clear: 'Clear',
    copy: 'Copy', copied: 'Copied', download: 'Download', validJson: 'Valid JSON',
    indentation: 'Indentation', spaces: 'spaces', convert: 'Convert', direction: 'Direction',
    delimiter: 'Delimiter', comma: 'Comma', semicolon: 'Semicolon', tab: 'Tab',
    csvPlaceholder: 'name,email\nAna,ana@example.com',
    jsonArrayPlaceholder: '[{"name":"Ana","email":"ana@example.com"}]',
    uploadJson: 'Upload JSON', uploadCsv: 'Upload CSV', fileLoaded: 'File loaded',
    csvEscaping: 'Quotes inside arrays and objects are doubled according to the CSV standard. This is valid and keeps the complete value in one cell.',
    inferTypes: 'Restore JSON types', inferTypesHelp: 'Converts numbers, booleans, null, arrays and objects; identifiers with leading zeroes remain text.',
    text: 'Text', file: 'File', encode: 'Encode', decode: 'Decode',
    base64Placeholder: 'Type text or paste a Base64 value…', selectFile: 'Select file',
    fileReady: 'File ready', includeDataUri: 'Include Data URI prefix',
    downloadDecoded: 'Download decoded file', transform: 'Transformation',
    sourceText: 'Original text', resultText: 'Transformed text', textPlaceholder: 'Type or paste text…',
    uppercase: 'UPPERCASE', lowercase: 'lowercase', title: 'Title Case', sentence: 'Sentence case',
    camel: 'camelCase', snake: 'snake_case', kebab: 'kebab-case', trim: 'Clean spaces',
    chars: 'characters', words: 'words', emptyResult: 'The result will appear here.',
  },
};

function ActionButton({ children, icon: Icon, secondary = false, ...props }) {
  return (
    <button type="button" className={`mini-action ${secondary ? 'secondary' : ''}`} {...props}>
      {Icon && <Icon size={16} />}{children}
    </button>
  );
}

function ResultActions({ value, filename, type, copy, copied, onCopied }) {
  if (!value) return null;
  const handleCopy = async () => {
    await copyText(value);
    onCopied();
  };
  return (
    <div className="mini-result-actions">
      <button type="button" onClick={handleCopy}><Clipboard size={14} />{copied ? copy.copied : copy.copy}</button>
      <button type="button" onClick={() => downloadText(value, filename, type)}><Download size={14} />{copy.download}</button>
    </div>
  );
}

export function JsonFormatter({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const process = (mode) => {
    try {
      const result = mode === 'minify' ? minifyJson(input) : formatJson(input, indent);
      setOutput(result);
      setError('');
      setSuccess(copy.validJson);
    } catch (currentError) {
      setOutput('');
      setSuccess('');
      setError(currentError.message);
    }
  };

  return (
    <div className="mini-tool">
      <div className="mini-toolbar">
        <div className="mini-field compact">
          <label htmlFor="json-indent">{copy.indentation}</label>
          <select id="json-indent" value={indent} onChange={(event) => setIndent(Number(event.target.value))}>
            <option value="2">2 {copy.spaces}</option><option value="4">4 {copy.spaces}</option>
          </select>
        </div>
        <div className="mini-toolbar-actions">
          <ActionButton icon={WandSparkles} onClick={() => process('format')} disabled={!input.trim()}>{copy.format}</ActionButton>
          <ActionButton icon={Minimize2} secondary onClick={() => process('minify')} disabled={!input.trim()}>{copy.minify}</ActionButton>
          <ActionButton icon={Check} secondary onClick={() => process('validate')} disabled={!input.trim()}>{copy.validate}</ActionButton>
          <ActionButton icon={Eraser} secondary onClick={() => { setInput(''); setOutput(''); setError(''); setSuccess(''); }}>{copy.clear}</ActionButton>
        </div>
      </div>
      {(error || success) && <div className={`mini-message ${error ? 'error' : 'success'}`}>{error || success}</div>}
      <div className="mini-editor-grid">
        <label className="mini-editor"><span>{copy.input}</span><textarea value={input} onChange={(event) => { setInput(event.target.value); setError(''); setSuccess(''); }} placeholder={copy.pasteJson} spellCheck="false" /></label>
        <div className="mini-editor result"><span>{copy.output}</span><textarea value={output} readOnly placeholder={copy.emptyResult} spellCheck="false" /><ResultActions value={output} filename="formatted.json" type="application/json" copy={copy} copied={copied} onCopied={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }} /></div>
      </div>
    </div>
  );
}

export function JsonCsvConverter({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [direction, setDirection] = useState('json-csv');
  const [delimiterKey, setDelimiterKey] = useState('comma');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sourceFilename, setSourceFilename] = useState('');
  const [inferTypes, setInferTypes] = useState(true);
  const fileInputRef = useRef(null);
  const delimiter = { comma: ',', semicolon: ';', tab: '\t' }[delimiterKey];

  const convert = () => {
    try {
      setOutput(
        direction === 'json-csv'
          ? objectsToCsv(JSON.parse(input), delimiter)
          : JSON.stringify(csvToObjects(input, delimiter, { inferTypes }), null, 2)
      );
      setError('');
    } catch (currentError) {
      setOutput('');
      setError(currentError.message);
    }
  };

  const swap = () => {
    setDirection((current) => current === 'json-csv' ? 'csv-json' : 'json-csv');
    setInput(output || '');
    setOutput('');
    setError('');
    setSourceFilename('');
  };

  const selectDirection = (nextDirection) => {
    setDirection(nextDirection);
    setOutput('');
    setError('');
    setSourceFilename('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadSourceFile = async (file) => {
    if (!file) return;
    const expectedExtension = direction === 'json-csv' ? '.json' : '.csv';
    if (!file.name.toLowerCase().endsWith(expectedExtension)) {
      setError(
        language === 'en'
          ? `Select a ${expectedExtension} file.`
          : `Selecciona un archivo ${expectedExtension}.`
      );
      return;
    }
    try {
      const content = (await file.text()).replace(/^\uFEFF/, '');
      if (direction === 'json-csv') JSON.parse(content);
      setInput(content);
      setOutput('');
      setError('');
      setSourceFilename(file.name);
    } catch (currentError) {
      setError(currentError.message);
      setSourceFilename('');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isJsonInput = direction === 'json-csv';
  const resultFilename = `${safeFilename(
    stripExtension(sourceFilename || 'datos')
  )}.${isJsonInput ? 'csv' : 'json'}`;
  const hasNestedJson =
    isJsonInput && output && /(?:^|,|;|\t)"[\[{](?:.|\n)*[\]}]"(?:,|;|\t|$)/m.test(output);
  return (
    <div className="mini-tool">
      <div className="mini-toolbar">
        <div className="mini-segmented" aria-label={copy.direction}>
          <button type="button" className={isJsonInput ? 'active' : ''} onClick={() => selectDirection('json-csv')}>JSON → CSV</button>
          <button type="button" className={!isJsonInput ? 'active' : ''} onClick={() => selectDirection('csv-json')}>CSV → JSON</button>
        </div>
        <div className="mini-field compact"><label htmlFor="csv-delimiter">{copy.delimiter}</label><select id="csv-delimiter" value={delimiterKey} onChange={(event) => setDelimiterKey(event.target.value)}><option value="comma">{copy.comma}</option><option value="semicolon">{copy.semicolon}</option><option value="tab">{copy.tab}</option></select></div>
        <div className="mini-toolbar-actions">
          <label className="mini-file-button">
            <FileUp size={16} />
            <span>{isJsonInput ? copy.uploadJson : copy.uploadCsv}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={isJsonInput ? ".json,application/json" : ".csv,text/csv,application/csv"}
              onChange={(event) => loadSourceFile(event.target.files?.[0])}
            />
          </label>
          <ActionButton icon={Play} onClick={convert} disabled={!input.trim()}>{copy.convert}</ActionButton><ActionButton icon={ArrowDownUp} secondary onClick={swap}>{copy.direction}</ActionButton>
        </div>
      </div>
      {sourceFilename && <div className="mini-loaded-file"><Check size={14} /><span>{copy.fileLoaded}: <strong>{sourceFilename}</strong></span></div>}
      {!isJsonInput && (
        <label className="mini-inference-option">
          <input
            type="checkbox"
            checked={inferTypes}
            onChange={(event) => setInferTypes(event.target.checked)}
          />
          <span>
            <strong>{copy.inferTypes}</strong>
            <small>{copy.inferTypesHelp}</small>
          </span>
        </label>
      )}
      {error && <div className="mini-message error">{error}</div>}
      <div className="mini-editor-grid">
        <label className="mini-editor"><span>{isJsonInput ? 'JSON' : 'CSV'}</span><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={isJsonInput ? copy.jsonArrayPlaceholder : copy.csvPlaceholder} spellCheck="false" /></label>
        <div className="mini-editor result"><span>{isJsonInput ? 'CSV' : 'JSON'}</span><textarea value={output} readOnly placeholder={copy.emptyResult} spellCheck="false" />{hasNestedJson && <p className="mini-csv-note">{copy.csvEscaping}</p>}<ResultActions value={output} filename={resultFilename} type={isJsonInput ? 'text/csv;charset=utf-8' : 'application/json'} copy={copy} copied={copied} onCopied={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }} /></div>
      </div>
    </div>
  );
}

export function Base64Tool({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [mode, setMode] = useState('text');
  const [direction, setDirection] = useState('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [file, setFile] = useState(null);
  const [dataUri, setDataUri] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const processText = () => {
    try {
      setOutput(direction === 'encode' ? utf8ToBase64(input) : base64ToUtf8(input));
      setError('');
    } catch {
      setOutput('');
      setError(language === 'en' ? 'The value is not valid Base64 or UTF-8.' : 'El valor no es Base64 o UTF-8 válido.');
    }
  };

  const processFile = async () => {
    if (!file) return;
    try {
      const base64 = arrayBufferToBase64(await file.arrayBuffer());
      setOutput(dataUri ? `data:${file.type || 'application/octet-stream'};base64,${base64}` : base64);
      setError('');
    } catch (currentError) { setError(currentError.message); }
  };

  const downloadDecoded = () => {
    try {
      const match = input.trim().match(/^data:([^;,]+)?;base64,/s);
      const bytes = base64ToBytes(input);
      downloadBlob(new Blob([bytes], { type: match?.[1] || 'application/octet-stream' }), 'base64-decoded.bin');
      setError('');
    } catch { setError(language === 'en' ? 'Invalid Base64 value.' : 'El valor Base64 no es válido.'); }
  };

  return (
    <div className="mini-tool">
      <div className="mini-toolbar">
        <div className="mini-segmented"><button type="button" className={mode === 'text' ? 'active' : ''} onClick={() => { setMode('text'); setOutput(''); }}>{copy.text}</button><button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => { setMode('file'); setDirection('encode'); setOutput(''); }}>{copy.file}</button></div>
        {mode === 'text' && <div className="mini-segmented"><button type="button" className={direction === 'encode' ? 'active' : ''} onClick={() => { setDirection('encode'); setOutput(''); }}>{copy.encode}</button><button type="button" className={direction === 'decode' ? 'active' : ''} onClick={() => { setDirection('decode'); setOutput(''); }}>{copy.decode}</button></div>}
        <div className="mini-toolbar-actions"><ActionButton icon={Play} onClick={mode === 'file' ? processFile : processText} disabled={mode === 'file' ? !file : !input.trim()}>{mode === 'file' || direction === 'encode' ? copy.encode : copy.decode}</ActionButton>{mode === 'text' && direction === 'decode' && <ActionButton icon={Download} secondary onClick={downloadDecoded} disabled={!input.trim()}>{copy.downloadDecoded}</ActionButton>}</div>
      </div>
      {error && <div className="mini-message error">{error}</div>}
      {mode === 'file' ? (
        <div className="mini-file-layout">
          <label className="mini-dropzone"><FileUp size={30} /><strong>{copy.selectFile}</strong><span>{file ? `${file.name} · ${formatBytes(file.size)}` : 'Base64'}</span><input type="file" onChange={(event) => { setFile(event.target.files?.[0] || null); setOutput(''); }} /></label>
          <label className="mini-checkbox"><input type="checkbox" checked={dataUri} onChange={(event) => setDataUri(event.target.checked)} />{copy.includeDataUri}</label>
          <div className="mini-editor result"><span>{copy.output}</span><textarea value={output} readOnly placeholder={copy.emptyResult} spellCheck="false" /><ResultActions value={output} filename="base64.txt" type="text/plain;charset=utf-8" copy={copy} copied={copied} onCopied={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }} /></div>
        </div>
      ) : (
        <div className="mini-editor-grid"><label className="mini-editor"><span>{copy.input}</span><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={copy.base64Placeholder} spellCheck="false" /></label><div className="mini-editor result"><span>{copy.output}</span><textarea value={output} readOnly placeholder={copy.emptyResult} spellCheck="false" /><ResultActions value={output} filename="base64-result.txt" type="text/plain;charset=utf-8" copy={copy} copied={copied} onCopied={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }} /></div></div>
      )}
    </div>
  );
}

export function CaseConverter({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [active, setActive] = useState('');
  const [copied, setCopied] = useState(false);
  const options = useMemo(() => [
    ['upper', copy.uppercase], ['lower', copy.lowercase], ['title', copy.title],
    ['sentence', copy.sentence], ['camel', copy.camel], ['snake', copy.snake],
    ['kebab', copy.kebab], ['trim', copy.trim],
  ], [copy]);
  const apply = (type) => { setActive(type); setOutput(transformText(input, type, language)); };
  const wordCount = countWords(input);

  return (
    <div className="mini-tool">
      <div className="case-options" aria-label={copy.transform}>{options.map(([id, label]) => <button type="button" key={id} className={active === id ? 'active' : ''} onClick={() => apply(id)} disabled={!input}>{label}</button>)}</div>
      <div className="mini-editor-grid"><label className="mini-editor"><span>{copy.sourceText}<small>{input.length} {copy.chars} · {wordCount} {copy.words}</small></span><textarea value={input} onChange={(event) => { setInput(event.target.value); if (active) setOutput(transformText(event.target.value, active, language)); }} placeholder={copy.textPlaceholder} /></label><div className="mini-editor result"><span>{copy.resultText}</span><textarea value={output} readOnly placeholder={copy.emptyResult} /><ResultActions value={output} filename="texto-transformado.txt" type="text/plain;charset=utf-8" copy={copy} copied={copied} onCopied={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }} /></div></div>
    </div>
  );
}

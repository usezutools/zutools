import React, { useEffect, useMemo, useState } from 'react';
import { Download, Image as ImageIcon, LockKeyhole, Play, RotateCcw, Upload } from 'lucide-react';
import {
  canvasToBlob,
  loadImage,
  renderImageToCanvas,
} from '@zutools/core/image';
import { extractImageMetadata } from '@zutools/core/image-metadata';
import {
  downloadBlob,
  formatBytes,
  safeFilename,
  stripExtension,
} from './shared';

const COPY = {
  es: {
    choose: 'Seleccionar imagen', drop: 'PNG, JPG o WebP', original: 'Original', result: 'Resultado',
    outputFormat: 'Formato de salida', quality: 'Calidad', background: 'Fondo para JPG',
    convert: 'Convertir imagen', resize: 'Redimensionar', clean: 'Eliminar metadatos',
    download: 'Descargar resultado', width: 'Anchura', height: 'Altura', pixels: 'px',
    keepRatio: 'Mantener proporción', reset: 'Restablecer', dimensions: 'Dimensiones',
    noUpload: 'La imagen se procesa con Canvas dentro de este navegador.',
    metadataInfo: 'Al recodificar los píxeles se eliminan EXIF, GPS, fecha, cámara y otros bloques de metadatos.',
    metadataWarning: 'La orientación visual se conserva en navegadores modernos, pero la firma binaria del archivo cambia.',
    metadataDetected: 'Metadatos detectados', fileData: 'Datos del archivo', embeddedData: 'Metadatos incrustados',
    noEmbeddedMetadata: 'No se han encontrado metadatos EXIF, GPS, XMP o textuales incrustados.',
    readingMetadata: 'Leyendo metadatos…', fields: 'campos',
    processing: 'Procesando…', unsupported: 'Selecciona una imagen PNG, JPG o WebP válida.',
    tooLarge: 'Las dimensiones solicitadas son demasiado grandes para este navegador.',
  },
  en: {
    choose: 'Select image', drop: 'PNG, JPG or WebP', original: 'Original', result: 'Result',
    outputFormat: 'Output format', quality: 'Quality', background: 'JPG background',
    convert: 'Convert image', resize: 'Resize', clean: 'Remove metadata',
    download: 'Download result', width: 'Width', height: 'Height', pixels: 'px',
    keepRatio: 'Keep aspect ratio', reset: 'Reset', dimensions: 'Dimensions',
    noUpload: 'The image is processed with Canvas inside this browser.',
    metadataInfo: 'Re-encoding pixels removes EXIF, GPS, date, camera and other metadata blocks.',
    metadataWarning: 'Visual orientation is preserved in modern browsers, but the file binary signature changes.',
    metadataDetected: 'Detected metadata', fileData: 'File data', embeddedData: 'Embedded metadata',
    noEmbeddedMetadata: 'No embedded EXIF, GPS, XMP or textual metadata was found.',
    readingMetadata: 'Reading metadata…', fields: 'fields',
    processing: 'Processing…', unsupported: 'Select a valid PNG, JPG or WebP image.',
    tooLarge: 'The requested dimensions are too large for this browser.',
  },
};

const MIME_TO_EXTENSION = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

function useObjectUrl(blob) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return undefined; }
    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [blob]);
  return url;
}

function ImagePicker({ file, previewUrl, onFile, copy }) {
  return (
    <label className={`image-picker ${file ? 'has-image' : ''}`}>
      {previewUrl ? <img src={previewUrl} alt="" /> : <span className="image-picker-icon"><Upload size={28} /></span>}
      <span className="image-picker-copy"><strong>{file?.name || copy.choose}</strong><small>{file ? `${formatBytes(file.size)} · ${file.type}` : copy.drop}</small></span>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onFile(event.target.files?.[0] || null)} />
    </label>
  );
}

function ImageResult({ url, blob, filename, dimensions, copy }) {
  if (!url || !blob) return <div className="image-result-empty"><ImageIcon size={28} /><span>{copy.result}</span></div>;
  return (
    <div className="image-result-card">
      <div className="image-result-preview"><img src={url} alt={copy.result} /></div>
      <div className="image-result-meta"><div><strong>{filename}</strong><span>{formatBytes(blob.size)}{dimensions ? ` · ${dimensions}` : ''}</span></div><button type="button" onClick={() => downloadBlob(blob, filename)}><Download size={16} />{copy.download}</button></div>
    </div>
  );
}

function validateFile(file, copy) {
  if (!file || !MIME_TO_EXTENSION[file.type]) throw new Error(copy.unsupported);
}

export function ImageConverter({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [outputType, setOutputType] = useState('image/webp');
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState('#ffffff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const originalUrl = useObjectUrl(file);
  const resultUrl = useObjectUrl(result?.blob);

  const selectFile = (nextFile) => { setFile(nextFile); setResult(null); setError(''); };
  const convert = async () => {
    setBusy(true);
    try {
      validateFile(file, copy);
      const { image, url } = await loadImage(file);
      const canvas = renderImageToCanvas(image, image.naturalWidth, image.naturalHeight, outputType === 'image/jpeg' ? background : null);
      URL.revokeObjectURL(url);
      const blob = await canvasToBlob(canvas, outputType, quality / 100);
      const extension = MIME_TO_EXTENSION[outputType];
      setResult({ blob, filename: `${safeFilename(stripExtension(file.name))}.${extension}`, dimensions: `${canvas.width} × ${canvas.height}` });
      setError('');
    } catch (currentError) { setError(currentError.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mini-tool image-tool">
      <div className="image-tool-grid"><div><ImagePicker file={file} previewUrl={originalUrl} onFile={selectFile} copy={copy} /><p className="image-private-note"><LockKeyhole size={14} />{copy.noUpload}</p><div className="image-controls"><label className="mini-field"><span>{copy.outputFormat}</span><select value={outputType} onChange={(event) => setOutputType(event.target.value)}><option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option></select></label>{outputType !== 'image/png' && <label className="mini-field grow"><span>{copy.quality}: {quality}%</span><input type="range" min="20" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>}{outputType === 'image/jpeg' && <label className="mini-field"><span>{copy.background}</span><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label>}</div><button type="button" className="mini-action image-primary-action" onClick={convert} disabled={!file || busy}><Play size={17} />{busy ? copy.processing : copy.convert}</button>{error && <div className="mini-message error">{error}</div>}</div><ImageResult url={resultUrl} blob={result?.blob} filename={result?.filename} dimensions={result?.dimensions} copy={copy} /></div>
    </div>
  );
}

export function ResizeImage({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [file, setFile] = useState(null);
  const [sourceSize, setSourceSize] = useState(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [locked, setLocked] = useState(true);
  const [outputType, setOutputType] = useState('image/webp');
  const [quality, setQuality] = useState(90);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const originalUrl = useObjectUrl(file);
  const resultUrl = useObjectUrl(result?.blob);

  const selectFile = async (nextFile) => {
    setFile(nextFile); setResult(null); setError('');
    if (!nextFile) { setSourceSize(null); return; }
    try {
      validateFile(nextFile, copy);
      const { image, url } = await loadImage(nextFile);
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight, ratio: image.naturalWidth / image.naturalHeight };
      URL.revokeObjectURL(url);
      setSourceSize(dimensions); setWidth(String(dimensions.width)); setHeight(String(dimensions.height));
    } catch (currentError) { setError(currentError.message); }
  };

  const updateWidth = (value) => { setWidth(value); if (locked && sourceSize && Number(value) > 0) setHeight(String(Math.round(Number(value) / sourceSize.ratio))); };
  const updateHeight = (value) => { setHeight(value); if (locked && sourceSize && Number(value) > 0) setWidth(String(Math.round(Number(value) * sourceSize.ratio))); };
  const reset = () => { if (sourceSize) { setWidth(String(sourceSize.width)); setHeight(String(sourceSize.height)); } };
  const resize = async () => {
    const nextWidth = Number(width); const nextHeight = Number(height);
    if (!nextWidth || !nextHeight || nextWidth > 16384 || nextHeight > 16384) { setError(copy.tooLarge); return; }
    setBusy(true);
    try {
      const { image, url } = await loadImage(file);
      const canvas = renderImageToCanvas(image, nextWidth, nextHeight, outputType === 'image/jpeg' ? '#ffffff' : null);
      URL.revokeObjectURL(url);
      const blob = await canvasToBlob(canvas, outputType, quality / 100);
      const extension = MIME_TO_EXTENSION[outputType];
      setResult({ blob, filename: `${safeFilename(stripExtension(file.name))}-${canvas.width}x${canvas.height}.${extension}`, dimensions: `${canvas.width} × ${canvas.height}` }); setError('');
    } catch (currentError) { setError(currentError.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mini-tool image-tool"><div className="image-tool-grid"><div><ImagePicker file={file} previewUrl={originalUrl} onFile={selectFile} copy={copy} /><div className="resize-dimensions"><label className="mini-field grow"><span>{copy.width}</span><div className="input-suffix"><input type="number" min="1" max="16384" value={width} onChange={(event) => updateWidth(event.target.value)} /><small>{copy.pixels}</small></div></label><button type="button" className={`ratio-lock ${locked ? 'active' : ''}`} onClick={() => setLocked((current) => !current)} aria-pressed={locked}><LockKeyhole size={16} /></button><label className="mini-field grow"><span>{copy.height}</span><div className="input-suffix"><input type="number" min="1" max="16384" value={height} onChange={(event) => updateHeight(event.target.value)} /><small>{copy.pixels}</small></div></label></div><label className="mini-checkbox"><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} />{copy.keepRatio}</label><div className="image-controls"><label className="mini-field"><span>{copy.outputFormat}</span><select value={outputType} onChange={(event) => setOutputType(event.target.value)}><option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option></select></label>{outputType !== 'image/png' && <label className="mini-field grow"><span>{copy.quality}: {quality}%</span><input type="range" min="20" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>}</div><div className="image-action-row"><button type="button" className="mini-action" onClick={resize} disabled={!file || busy}><Play size={17} />{busy ? copy.processing : copy.resize}</button><button type="button" className="mini-action secondary" onClick={reset} disabled={!file}><RotateCcw size={16} />{copy.reset}</button></div>{error && <div className="mini-message error">{error}</div>}</div><ImageResult url={resultUrl} blob={result?.blob} filename={result?.filename} dimensions={result?.dimensions} copy={copy} /></div></div>
  );
}

export function MetadataRemover({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState(null);
  const originalUrl = useObjectUrl(file);
  const resultUrl = useObjectUrl(result?.blob);
  const outputType = useMemo(() => MIME_TO_EXTENSION[file?.type] ? file.type : 'image/png', [file]);

  const selectFile = async (nextFile) => {
    setFile(nextFile);
    setResult(null);
    setMetadata(null);
    setError('');
    if (!nextFile) return;
    setReading(true);
    try {
      validateFile(nextFile, copy);
      const { image, url } = await loadImage(nextFile);
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      setMetadata(await extractImageMetadata(nextFile, dimensions));
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setReading(false);
    }
  };

  const clean = async () => {
    setBusy(true);
    try {
      validateFile(file, copy);
      const { image, url } = await loadImage(file);
      const canvas = renderImageToCanvas(image, image.naturalWidth, image.naturalHeight, outputType === 'image/jpeg' ? '#ffffff' : null);
      URL.revokeObjectURL(url);
      const blob = await canvasToBlob(canvas, outputType, 0.94);
      setResult({ blob, filename: `${safeFilename(stripExtension(file.name))}-sin-metadatos.${MIME_TO_EXTENSION[outputType]}`, dimensions: `${canvas.width} × ${canvas.height}` }); setError('');
    } catch (currentError) { setError(currentError.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mini-tool image-tool">
      <div className="metadata-callout"><LockKeyhole size={22} /><div><strong>{copy.metadataInfo}</strong><span>{copy.metadataWarning}</span></div></div>
      <div className="image-tool-grid">
        <div>
          <ImagePicker file={file} previewUrl={originalUrl} onFile={selectFile} copy={copy} />
          {reading && <div className="metadata-reading"><span />{copy.readingMetadata}</div>}
          {metadata && (
            <section className="metadata-panel" aria-label={copy.metadataDetected}>
              <header><div><LockKeyhole size={16} /><strong>{copy.metadataDetected}</strong></div><span>{metadata.embedded.length} {copy.fields}</span></header>
              <div className="metadata-group"><h3>{copy.fileData}</h3><dl>{metadata.basic.map((entry) => <div key={`${entry.key}-${entry.value}`}><dt>{entry.key}</dt><dd>{entry.value}</dd></div>)}</dl></div>
              <div className="metadata-group embedded"><h3>{copy.embeddedData}</h3>{metadata.embedded.length > 0 ? <dl>{metadata.embedded.map((entry) => <div key={`${entry.key}-${entry.value}`}><dt>{entry.key}</dt><dd>{entry.value}</dd></div>)}</dl> : <p>{copy.noEmbeddedMetadata}</p>}</div>
            </section>
          )}
          <button type="button" className="mini-action image-primary-action" onClick={clean} disabled={!file || busy || reading}><LockKeyhole size={17} />{busy ? copy.processing : copy.clean}</button>
          {error && <div className="mini-message error">{error}</div>}
        </div>
        <ImageResult url={resultUrl} blob={result?.blob} filename={result?.filename} dimensions={result?.dimensions} copy={copy} />
      </div>
    </div>
  );
}

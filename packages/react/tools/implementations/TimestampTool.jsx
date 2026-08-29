import React, { useEffect, useMemo, useState } from 'react';
import { Clipboard, Clock3, RefreshCw } from 'lucide-react';
import {
  dateToUnix,
  timestampToDate,
  toDateTimeLocalValue,
} from '@zutools/core/timestamp';
import { copyText } from './shared';

const COPY = {
  es: {
    timestamp: 'Timestamp Unix', date: 'Fecha y hora', now: 'Usar ahora', convert: 'Convertir',
    seconds: 'Segundos', milliseconds: 'Milisegundos', auto: 'Detección automática',
    local: 'Hora local', utc: 'UTC', iso: 'ISO 8601', relative: 'Respecto a ahora',
    invalid: 'Introduce una fecha o timestamp válido.', copy: 'Copiar', copied: 'Copiado',
    before: 'antes', after: 'después', same: 'ahora mismo', days: 'días', hours: 'horas', minutes: 'minutos',
  },
  en: {
    timestamp: 'Unix timestamp', date: 'Date and time', now: 'Use current time', convert: 'Convert',
    seconds: 'Seconds', milliseconds: 'Milliseconds', auto: 'Auto-detect',
    local: 'Local time', utc: 'UTC', iso: 'ISO 8601', relative: 'Relative to now',
    invalid: 'Enter a valid date or timestamp.', copy: 'Copy', copied: 'Copied',
    before: 'before', after: 'after', same: 'right now', days: 'days', hours: 'hours', minutes: 'minutes',
  },
};

function relativeLabel(date, copy) {
  const difference = date.getTime() - Date.now();
  const absolute = Math.abs(difference);
  if (absolute < 30_000) return copy.same;
  const units = absolute >= 86_400_000
    ? [Math.round(absolute / 86_400_000), copy.days]
    : absolute >= 3_600_000
    ? [Math.round(absolute / 3_600_000), copy.hours]
    : [Math.round(absolute / 60_000), copy.minutes];
  return `${units[0]} ${units[1]} ${difference < 0 ? copy.before : copy.after}`;
}

export default function TimestampTool({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [mode, setMode] = useState('timestamp');
  const [timestamp, setTimestamp] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [unit, setUnit] = useState('auto');
  const [dateValue, setDateValue] = useState(() => toDateTimeLocalValue(new Date()));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const setDateResult = (date) => {
    const unix = dateToUnix(date);
    setResult({
      seconds: unix.seconds,
      milliseconds: unix.milliseconds,
      local: new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'es-ES', { dateStyle: 'full', timeStyle: 'long' }).format(date),
      utc: date.toUTCString(),
      iso: date.toISOString(),
      relative: relativeLabel(date, copy),
    });
    setError('');
  };

  const convert = () => {
    let date;
    if (mode === 'timestamp') {
      try {
        date = timestampToDate(timestamp.trim(), { unit });
      } catch {
        setError(copy.invalid);
        setResult(null);
        return;
      }
    } else {
      date = new Date(dateValue);
    }
    if (Number.isNaN(date.getTime())) { setError(copy.invalid); setResult(null); return; }
    setDateResult(date);
  };

  useEffect(() => { convert(); }, []); // Initial useful result.

  const rows = useMemo(() => result ? [
    ['seconds', copy.seconds, String(result.seconds)],
    ['milliseconds', copy.milliseconds, String(result.milliseconds)],
    ['local', copy.local, result.local],
    ['utc', copy.utc, result.utc],
    ['iso', copy.iso, result.iso],
    ['relative', copy.relative, result.relative],
  ] : [], [copy, result]);

  const useNow = () => {
    const now = new Date();
    setTimestamp(String(Math.floor(now.getTime() / 1000)));
    setDateValue(toDateTimeLocalValue(now));
    setDateResult(now);
  };

  return (
    <div className="mini-tool timestamp-tool">
      <div className="mini-toolbar">
        <div className="mini-segmented"><button type="button" className={mode === 'timestamp' ? 'active' : ''} onClick={() => setMode('timestamp')}>{copy.timestamp}</button><button type="button" className={mode === 'date' ? 'active' : ''} onClick={() => setMode('date')}>{copy.date}</button></div>
        <div className="mini-toolbar-actions"><button type="button" className="mini-action secondary" onClick={useNow}><Clock3 size={16} />{copy.now}</button><button type="button" className="mini-action" onClick={convert}><RefreshCw size={16} />{copy.convert}</button></div>
      </div>
      <div className="timestamp-input-card">
        {mode === 'timestamp' ? <><label className="mini-field grow"><span>{copy.timestamp}</span><input type="text" inputMode="numeric" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && convert()} /></label><label className="mini-field"><span>{copy.auto}</span><select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="auto">{copy.auto}</option><option value="seconds">{copy.seconds}</option><option value="milliseconds">{copy.milliseconds}</option></select></label></> : <label className="mini-field grow"><span>{copy.date}</span><input type="datetime-local" value={dateValue} onChange={(event) => setDateValue(event.target.value)} /></label>}
      </div>
      {error && <div className="mini-message error">{error}</div>}
      {result && <div className="timestamp-results">{rows.map(([id, label, value]) => <div key={id}><span>{label}</span><strong>{value}</strong><button type="button" onClick={async () => { await copyText(value); setCopied(id); window.setTimeout(() => setCopied(''), 1000); }}><Clipboard size={14} />{copied === id ? copy.copied : copy.copy}</button></div>)}</div>}
    </div>
  );
}

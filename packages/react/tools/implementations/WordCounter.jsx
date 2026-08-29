import React, { useMemo, useState } from 'react';
import { Clock3, Hash, LetterText, Pilcrow, TextCursorInput } from 'lucide-react';
import { analyzeText, DEFAULT_WORDS_PER_MINUTE } from '@zutools/core/word-counter';

const COPY = {
  es: {
    text: 'Texto',
    placeholder: 'Escribe o pega aquí el texto que quieres analizar…',
    readingSpeed: 'Velocidad de lectura',
    wordsPerMinute: 'palabras/min',
    words: 'Palabras',
    characters: 'Caracteres',
    withoutSpaces: 'Sin espacios',
    sentences: 'Frases',
    paragraphs: 'Párrafos',
    readingTime: 'Tiempo de lectura',
    empty: '0 min',
    underMinute: '< 1 min',
    minutes: 'min',
  },
  en: {
    text: 'Text',
    placeholder: 'Type or paste the text you want to analyse…',
    readingSpeed: 'Reading speed',
    wordsPerMinute: 'words/min',
    words: 'Words',
    characters: 'Characters',
    withoutSpaces: 'Without spaces',
    sentences: 'Sentences',
    paragraphs: 'Paragraphs',
    readingTime: 'Reading time',
    empty: '0 min',
    underMinute: '< 1 min',
    minutes: 'min',
  },
};

const READING_SPEEDS = [180, DEFAULT_WORDS_PER_MINUTE, 250, 300];

function readingTimeLabel(seconds, copy) {
  if (!seconds) return copy.empty;
  if (seconds < 60) return copy.underMinute;
  return `${Math.ceil(seconds / 60)} ${copy.minutes}`;
}

export default function WordCounter({ language = 'es' }) {
  const copy = COPY[language] || COPY.es;
  const [text, setText] = useState('');
  const [wordsPerMinute, setWordsPerMinute] = useState(
    DEFAULT_WORDS_PER_MINUTE
  );
  const metrics = useMemo(
    () => analyzeText(text, { locale: language, wordsPerMinute }),
    [language, text, wordsPerMinute]
  );

  const cards = [
    { id: 'words', label: copy.words, value: metrics.words, icon: LetterText },
    {
      id: 'characters',
      label: copy.characters,
      value: metrics.characters,
      detail: `${metrics.charactersWithoutSpaces} ${copy.withoutSpaces.toLowerCase()}`,
      icon: Hash,
    },
    {
      id: 'sentences',
      label: copy.sentences,
      value: metrics.sentences,
      icon: TextCursorInput,
    },
    {
      id: 'paragraphs',
      label: copy.paragraphs,
      value: metrics.paragraphs,
      icon: Pilcrow,
    },
    {
      id: 'reading-time',
      label: copy.readingTime,
      value: readingTimeLabel(metrics.readingTimeSeconds, copy),
      icon: Clock3,
    },
  ];

  return (
    <div className="mini-tool word-counter">
      <div className="word-counter-toolbar">
        <label className="mini-field compact">
          <span>{copy.readingSpeed}</span>
          <select
            value={wordsPerMinute}
            onChange={(event) => setWordsPerMinute(Number(event.target.value))}
          >
            {READING_SPEEDS.map((speed) => (
              <option value={speed} key={speed}>
                {speed} {copy.wordsPerMinute}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mini-editor word-counter-editor">
        <span>{copy.text}</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={copy.placeholder}
        />
      </label>

      <div className="word-counter-metrics" aria-live="polite">
        {cards.map(({ id, label, value, detail, icon: Icon }) => (
          <article className="word-counter-metric" key={id}>
            <span className="word-counter-metric-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span>
              <small>{label}</small>
              <strong>{value}</strong>
              {detail && <em>{detail}</em>}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

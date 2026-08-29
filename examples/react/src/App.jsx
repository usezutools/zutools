import { lazy, Suspense, useState } from 'react';

const IsolatedExample = lazy(() => import('./IsolatedExample'));
const CatalogueExample = lazy(() => import('./CatalogueExample'));

const COPY = {
  en: {
    eyebrow: 'Consumer example',
    title: 'ZU Tools inside React',
    intro:
      'Switch between one tree-shakeable component and the complete catalogue.',
    isolated: 'Isolated tool',
    catalogue: 'Complete catalogue',
    openCounter: 'Open Word Counter',
    event: 'Last portal event',
    waiting: 'Waiting for interaction',
  },
  es: {
    eyebrow: 'Ejemplo consumidor',
    title: 'ZU Tools dentro de React',
    intro:
      'Cambia entre un componente independiente y el catálogo completo.',
    isolated: 'Herramienta aislada',
    catalogue: 'Catálogo completo',
    openCounter: 'Abrir Contador de palabras',
    event: 'Último evento del portal',
    waiting: 'Esperando interacción',
  },
};

export default function App() {
  const [view, setView] = useState('isolated');
  const [language, setLanguage] = useState('en');
  const [request, setRequest] = useState({ id: null, version: 0 });
  const [lastEvent, setLastEvent] = useState('');
  const copy = COPY[language];

  const openWordCounter = () => {
    setView('catalogue');
    setRequest((current) => ({
      id: 'word-counter',
      version: current.version + 1,
    }));
  };

  return (
    <main className="example-shell">
      <header className="example-header">
        <div>
          <span className="example-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>

        <div className="example-controls" aria-label="Example controls">
          <div className="example-segmented">
            <button
              type="button"
              className={view === 'isolated' ? 'active' : ''}
              onClick={() => setView('isolated')}
            >
              {copy.isolated}
            </button>
            <button
              type="button"
              className={view === 'catalogue' ? 'active' : ''}
              onClick={() => {
                setView('catalogue');
                setRequest((current) => ({
                  id: null,
                  version: current.version + 1,
                }));
              }}
            >
              {copy.catalogue}
            </button>
          </div>

          <div className="example-segmented example-language">
            {['en', 'es'].map((option) => (
              <button
                type="button"
                className={language === option ? 'active' : ''}
                key={option}
                onClick={() => setLanguage(option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <Suspense fallback={<div className="example-loading">Loading view…</div>}>
        {view === 'isolated' ? (
          <IsolatedExample language={language} />
        ) : (
          <CatalogueExample
            copy={copy}
            language={language}
            lastEvent={lastEvent}
            onEvent={setLastEvent}
            onOpenWordCounter={openWordCounter}
            request={request}
          />
        )}
      </Suspense>
    </main>
  );
}

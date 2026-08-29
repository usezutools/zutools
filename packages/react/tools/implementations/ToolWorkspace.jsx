import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { ToolIcon } from '../toolIcons';
import './implementations.css';

const COPY = {
  es: {
    back: 'Volver al catálogo',
    close: 'Cerrar herramienta',
    local: 'Procesamiento local',
    privacy: 'Los datos permanecen en este dispositivo.',
  },
  en: {
    back: 'Back to catalogue',
    close: 'Close tool',
    local: 'Local processing',
    privacy: 'Your data stays on this device.',
  },
};

export default function ToolWorkspace({ tool, component: Component, language, onClose }) {
  const closeRef = useRef(null);
  const copy = COPY[language] || COPY.es;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="tool-workspace-layer" role="dialog" aria-modal="true" aria-labelledby="workspace-title">
      <div className="tool-workspace">
        <header className="tool-workspace-header">
          <button ref={closeRef} type="button" className="tool-workspace-back" onClick={onClose}>
            <ArrowLeft size={18} />
            <span>{copy.back}</span>
          </button>
          <div className="tool-workspace-title">
            <span><ToolIcon tool={tool} size={22} /></span>
            <div>
              <h2 id="workspace-title">{tool.name}</h2>
              <small><ShieldCheck size={12} />{copy.local} · {copy.privacy}</small>
            </div>
          </div>
          <button type="button" className="tool-workspace-close" onClick={onClose} aria-label={copy.close}>
            <X size={20} />
          </button>
        </header>
        <main className="tool-workspace-body">
          <Component tool={tool} language={language} />
        </main>
      </div>
    </div>
  );
}

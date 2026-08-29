import React, { useEffect, useState } from 'react';
import ToolsPortal from './ToolsPortal';

export const ZUTOOLS_MESSAGE_TYPE = 'zutools:configure';

function normalizedLanguage(value, fallback = 'es') {
  return value === 'en' || value === 'es' ? value : fallback;
}

function languageFromLocation(fallback) {
  if (typeof window === 'undefined') return fallback;
  return normalizedLanguage(
    new URLSearchParams(window.location.search).get('lang'),
    fallback
  );
}

function toolFromLocation() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('tool');
}

/**
 * Standalone shell for deployments that prefer an isolated ZU Tools surface.
 * Normal consumers can import the MIT package directly without an iframe.
 */
export default function ZuToolsStandalone({
  language: initialLanguage = 'es',
  allowedParentOrigins = [],
  ...portalProps
}) {
  const fallbackLanguage = normalizedLanguage(initialLanguage);
  const [language, setLanguage] = useState(() =>
    languageFromLocation(fallbackLanguage)
  );
  const [requestedToolId, setRequestedToolId] = useState(toolFromLocation);

  useEffect(() => {
    const acceptedOrigins = new Set(allowedParentOrigins);
    const receiveConfiguration = (event) => {
      const sameOrigin = event.origin === window.location.origin;
      if (!sameOrigin && !acceptedOrigins.has(event.origin)) return;
      if (event.data?.type !== ZUTOOLS_MESSAGE_TYPE) return;
      setLanguage((current) => normalizedLanguage(event.data.language, current));
      if (typeof event.data.toolId === 'string')
        setRequestedToolId(event.data.toolId || null);
    };

    window.addEventListener('message', receiveConfiguration);
    return () => window.removeEventListener('message', receiveConfiguration);
  }, [allowedParentOrigins]);

  return (
    <ToolsPortal
      {...portalProps}
      language={language}
      requestedToolId={requestedToolId}
    />
  );
}

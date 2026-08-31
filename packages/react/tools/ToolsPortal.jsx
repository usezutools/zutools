import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import ToolWorkspace from './implementations/ToolWorkspace';
import { defaultToolRegistry } from './implementations/registry';
import { getActiveTools, toolsCatalog } from './catalog';
import { CategoryIcon, ToolIcon } from './toolIcons';
import './tools.css';

const FEATURED_IDS = [
  'json-formatter',
  'json-to-csv',
  'base64',
  'case-converter',
  'unix-timestamp',
  'webp-to-png',
  'resize-image',
  'image-metadata-remover',
];

const UI = {
  es: {
    eyebrow: 'Utilidades locales',
    title: 'Herramientas',
    intro:
      'Convierte, comprime y prepara archivos sin subirlos a ningún servidor.',
    privacyTitle: 'Tus archivos no salen del navegador',
    privacyCopy:
      'Todo el procesamiento se realiza en este dispositivo. Sin cargas, sin cuentas y sin esperas.',
    searchPlaceholder: 'Buscar una herramienta…',
    all: 'Todas',
    featured: 'Más útiles para empezar',
    catalog: 'Catálogo completo',
    tools: 'herramientas',
    oneTool: 'herramienta',
    noResults: 'No encontramos ninguna herramienta',
    noResultsCopy: 'Prueba con otro término o cambia la categoría seleccionada.',
    clear: 'Limpiar filtros',
    local: '100% local',
    proposed: 'Propuesta',
    openCard: 'Ver ficha',
    openTool: 'Abrir herramienta',
    close: 'Cerrar',
    detailPrivacy: 'Procesamiento privado',
    detailPrivacyCopy:
      'Esta herramienta está diseñada para ejecutarse en tu dispositivo.',
    area: 'Áreas relacionadas',
    implementation: 'Estado',
    catalogued: 'En catálogo',
    comingSoon: 'Preparada para implementar',
    deferred: 'Aplazada',
    deferredNote: '1 herramienta con conexión externa permanece fuera de esta fase.',
  },
  en: {
    eyebrow: 'Local utilities',
    title: 'Tools',
    intro: 'Convert, compress and prepare files without uploading them anywhere.',
    privacyTitle: 'Your files never leave the browser',
    privacyCopy:
      'Everything runs on this device. No uploads, no accounts and no waiting.',
    searchPlaceholder: 'Search tools…',
    all: 'All',
    featured: 'Most useful to start',
    catalog: 'Full catalogue',
    tools: 'tools',
    oneTool: 'tool',
    noResults: 'No tools found',
    noResultsCopy: 'Try another term or select a different category.',
    clear: 'Clear filters',
    local: '100% local',
    proposed: 'Proposal',
    openCard: 'View details',
    openTool: 'Open tool',
    close: 'Close',
    detailPrivacy: 'Private processing',
    detailPrivacyCopy: 'This tool is designed to run on your device.',
    area: 'Related areas',
    implementation: 'Status',
    catalogued: 'In catalogue',
    comingSoon: 'Ready to implement',
    deferred: 'Deferred',
    deferredNote: '1 tool requiring an external connection is outside this phase.',
  },
};

const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function ToolCard({
  tool,
  category,
  copy,
  implemented,
  onOpen,
  featured = false,
}) {
  const executionLabel = copy.local;

  return (
    <button
      type="button"
      className={`tools-card ${featured ? 'is-featured' : ''} ${implemented ? 'is-implemented' : ''}`}
      onClick={() => onOpen(tool)}
      aria-label={`${copy.openCard}: ${tool.name}`}
    >
      <span className="tools-card-top">
        <span className="tools-card-icon">
          <ToolIcon tool={tool} size={featured ? 24 : 22} />
        </span>
        <span className="tools-local-badge">
          <ShieldCheck size={12} />
          {executionLabel}
        </span>
      </span>
      <span className="tools-card-category">{category?.name}</span>
      <strong>{tool.name}</strong>
      <span className="tools-card-description">{tool.description}</span>
      <span className="tools-card-action">
        {implemented ? copy.openTool : copy.openCard}
        <ArrowRight size={16} />
      </span>
    </button>
  );
}

function ToolDetails({ tool, category, copy, onClose, titleId }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!tool) return null;

  return (
    <div className="tool-detail-layer" role="presentation" onMouseDown={onClose}>
      <article
        className="tool-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="tool-detail-head">
          <span className="tool-detail-icon">
            <ToolIcon tool={tool} size={28} />
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            className="tool-detail-close"
            onClick={onClose}
            aria-label={copy.close}
          >
            <X size={19} />
          </button>
        </header>

        <span className="tools-card-category">{category?.name}</span>
        <h2 id={titleId}>{tool.name}</h2>
        <p className="tool-detail-description">{tool.description}</p>

        <div className="tool-detail-privacy">
          <ShieldCheck size={19} />
          <div>
            <strong>{copy.detailPrivacy}</strong>
            <span>{copy.detailPrivacyCopy}</span>
          </div>
        </div>

        <dl className="tool-detail-meta">
          <div>
            <dt>{copy.implementation}</dt>
            <dd>
              <Check size={15} />
              {tool.status === 'proposed' ? copy.comingSoon : copy.catalogued}
            </dd>
          </div>
          {tool.operationalAreas?.length > 0 && (
            <div>
              <dt>{copy.area}</dt>
              <dd className="tool-area-list">
                {tool.operationalAreas.map((area) => (
                  <span key={area}>{area.replaceAll('-', ' ')}</span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </article>
    </div>
  );
}

export default function ToolsPortal({
  language = 'es',
  catalog = toolsCatalog,
  registry = defaultToolRegistry,
  featuredToolIds = FEATURED_IDS,
  brandLabel = 'ZU Tools',
  className = '',
  requestedToolId = null,
  onToolOpen = undefined,
  onToolClose = undefined,
}) {
  const copy = UI[language] || UI.es;
  const portalTitleId = useId();
  const detailTitleId = useId();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTool, setSelectedTool] = useState(null);
  const [activeTool, setActiveTool] = useState(null);

  const categoriesById = useMemo(
    () => new Map(catalog.categories.map((category) => [category.id, category])),
    [catalog]
  );

  const activeTools = useMemo(() => getActiveTools(catalog), [catalog]);

  const categories = useMemo(
    () =>
      catalog.categories
        .map((category) => ({
          ...category,
          count: activeTools.filter((tool) => tool.category === category.id)
            .length,
        }))
        .filter((category) => category.count > 0)
        .sort((a, b) => a.order - b.order),
    [activeTools, catalog]
  );

  const filteredTools = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return activeTools.filter((tool) => {
      if (activeCategory !== 'all' && tool.category !== activeCategory)
        return false;
      if (!normalizedQuery) return true;
      const category = categoriesById.get(tool.category);
      return normalize(
        [
          tool.name,
          tool.description,
          tool.id,
          category?.name,
          ...(tool.operationalAreas || []),
        ].join(' ')
      ).includes(normalizedQuery);
    });
  }, [activeCategory, activeTools, categoriesById, query]);

  const featuredTools = featuredToolIds.map((id) =>
    activeTools.find((tool) => tool.id === id)
  ).filter(Boolean);

  const selectedCategory = selectedTool
    ? categoriesById.get(selectedTool.category)
    : null;

  const clearFilters = () => {
    setQuery('');
    setActiveCategory('all');
  };

  const openTool = (tool) => {
    const implemented = registry.has(tool.id);
    onToolOpen?.(tool, { implemented });
    if (implemented) setActiveTool(tool);
    else setSelectedTool(tool);
  };

  useEffect(() => {
    if (!requestedToolId) return;
    const requestedTool = activeTools.find(({ id }) => id === requestedToolId);
    if (!requestedTool) return;
    if (registry.has(requestedTool.id)) {
      setSelectedTool(null);
      setActiveTool(requestedTool);
    } else {
      setActiveTool(null);
      setSelectedTool(requestedTool);
    }
  }, [activeTools, registry, requestedToolId]);

  const closeTool = (tool) => {
    setSelectedTool(null);
    setActiveTool(null);
    onToolClose?.(tool);
  };

  return (
    <section
      className={`tools-portal ${className}`.trim()}
      aria-labelledby={portalTitleId}
    >
      <header className="tools-hero">
        <div className="tools-hero-copy">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1 id={portalTitleId}>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        <div className="tools-privacy-callout">
          <span className="tools-privacy-icon">
            <ShieldCheck size={23} />
          </span>
          <div>
            <strong>{copy.privacyTitle}</strong>
            <p>{copy.privacyCopy}</p>
          </div>
        </div>
      </header>

      <div className="tools-search-wrap">
        <Search size={20} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchPlaceholder}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={copy.clear}>
            <X size={17} />
          </button>
        )}
      </div>

      <div className="tools-category-strip" aria-label={copy.catalog}>
        <button
          type="button"
          className={activeCategory === 'all' ? 'active' : ''}
          onClick={() => setActiveCategory('all')}
        >
          <Sparkles size={17} />
          <span>{copy.all}</span>
          <small>{activeTools.length}</small>
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            className={activeCategory === category.id ? 'active' : ''}
            onClick={() => setActiveCategory(category.id)}
          >
            <CategoryIcon categoryId={category.id} size={17} />
            <span>{category.name}</span>
            <small>{category.count}</small>
          </button>
        ))}
      </div>

      {!query && activeCategory === 'all' && (
        <section className="tools-featured" aria-labelledby="tools-featured-title">
          <div className="tools-section-heading">
            <div>
              <span className="tools-section-kicker">{brandLabel}</span>
              <h2 id="tools-featured-title">{copy.featured}</h2>
            </div>
            <span className="tools-result-count">{featuredTools.length}</span>
          </div>
          <div className="tools-featured-grid">
            {featuredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                category={categoriesById.get(tool.category)}
                copy={copy}
                implemented={registry.has(tool.id)}
                onOpen={openTool}
                featured
              />
            ))}
          </div>
        </section>
      )}

      <section className="tools-catalog" aria-labelledby="tools-catalog-title">
        <div className="tools-section-heading">
          <div>
            <span className="tools-section-kicker">{copy.local}</span>
            <h2 id="tools-catalog-title">{copy.catalog}</h2>
          </div>
          <span className="tools-result-count">
            {filteredTools.length}{' '}
            {filteredTools.length === 1 ? copy.oneTool : copy.tools}
          </span>
        </div>

        {filteredTools.length > 0 ? (
          <div className="tools-grid">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                category={categoriesById.get(tool.category)}
                copy={copy}
                implemented={registry.has(tool.id)}
                onOpen={openTool}
              />
            ))}
          </div>
        ) : (
          <div className="tools-empty">
            <span><Search size={25} /></span>
            <strong>{copy.noResults}</strong>
            <p>{copy.noResultsCopy}</p>
            <button type="button" onClick={clearFilters}>
              {copy.clear}
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <p className="tools-deferred-note">{copy.deferredNote}</p>
      </section>

      {selectedTool && (
        <ToolDetails
          tool={selectedTool}
          category={selectedCategory}
          copy={copy}
          titleId={detailTitleId}
          onClose={() => closeTool(selectedTool)}
        />
      )}
      {activeTool && (
        <ToolWorkspace
          tool={activeTool}
          component={registry.get(activeTool.id)}
          language={language}
          onClose={() => closeTool(activeTool)}
        />
      )}
    </section>
  );
}

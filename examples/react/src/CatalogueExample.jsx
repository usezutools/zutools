import {
  ToolsPortal,
  portalCatalog,
  portalRegistry,
} from '@zutools/react/portal';
import '@zutools/react/styles.css';

export default function CatalogueExample({
  copy,
  language,
  lastEvent,
  onEvent,
  onOpenWordCounter,
  request,
}) {
  return (
    <section className="example-catalogue">
      <div className="example-integration-bar">
        <div>
          <code>@zutools/react/portal</code>
          <small>
            {copy.event}: {lastEvent || copy.waiting}
          </small>
        </div>
        <button type="button" onClick={onOpenWordCounter}>
          {copy.openCounter}
        </button>
      </div>

      <ToolsPortal
        key={request.version}
        className="example-themed-portal"
        language={language}
        catalog={portalCatalog}
        registry={portalRegistry}
        requestedToolId={request.id}
        brandLabel="ZU Tools · React example"
        onToolOpen={(tool, state) =>
          onEvent(`open:${tool.id}:${state.implemented}`)
        }
        onToolClose={(tool) => onEvent(`close:${tool?.id || 'tool'}`)}
      />
    </section>
  );
}

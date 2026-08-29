# `@zutools/react`

Implementación local-first actual de ZU Tools. Los archivos se procesan en el
dispositivo y no se suben a ningún servidor.

> El paquete todavía no está publicado en npm. Sus motores y el catálogo ya
> proceden de `@zutools/core`; este paquete contiene la capa de interfaz React.

## Uso dentro del workspace

```jsx
import {
  ToolsPortal,
  freeToolsCatalog,
  freeToolRegistry,
} from '@zutools/react/free';
import '@zutools/react/styles.css';

export function ToolsPage() {
  return (
    <ToolsPortal
      language="es"
      catalog={freeToolsCatalog}
      registry={freeToolRegistry}
    />
  );
}
```

`freeToolsCatalog` solo incluye herramientas con implementación ejecutable. El
catálogo completo procede de `@zutools/core/catalog`.

El paquete es ESM, requiere React 18 o posterior como `peerDependency` y solo
publica JavaScript compilado, declaraciones TypeScript y CSS desde `dist/`.
`styles.css` incluye tanto el catálogo como el workspace de cada herramienta;
`workspace.css` está disponible para consumidores que importen únicamente las
implementaciones.

## Desarrollo

Desde la raíz:

```bash
npm test
npm run build
npm run validate
npm run pack:check
npm run test:tarballs
```

## Licencia

MIT para el código propio. Cada dependencia conserva su licencia.

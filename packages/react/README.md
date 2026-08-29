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

## Desarrollo

Desde la raíz:

```bash
npm test
npm run validate
npm run pack:check
```

## Licencia

MIT para el código propio. Cada dependencia conserva su licencia.

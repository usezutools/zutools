# ZU Tools

Herramientas local-first para procesar archivos y datos en el navegador: sin
login, sin subidas y con código abierto bajo MIT.

## Paquetes

```text
packages/core/               @zutools/core: motores y catálogo
packages/react/              @zutools/react: componentes y estilos
```

`@zutools/react` consume los motores de `@zutools/core`; no mantiene copias de
las transformaciones.

## Desarrollo

```bash
npm install
npm run build
npm test
npm run validate
npm run pack:check
npm run test:tarballs
npm run measure:tree-shaking
```

Los paquetes son ESM y publican exclusivamente archivos compilados desde
`dist/`. `npm run test:tarballs` instala los artefactos en consumidores
temporales independientes para comprobar JavaScript, React, CSS y TypeScript.
La medición de tree-shaking compara exports individuales con el portal completo
usando los tarballs reales.

## Uso provisional

```jsx
import {
  ToolsPortal,
  freeToolsCatalog,
  freeToolRegistry,
} from '@zutools/react/free';
import '@zutools/react/styles.css';
```

La API puede cambiar antes de `0.1.0`.

## Documentación

- [`packages/core/README.md`](packages/core/README.md): motores y entradas
  independientes.
- [`packages/react/README.md`](packages/react/README.md): integración React.

La fuente ejecutable del catálogo es
[`packages/core/catalog/tools.json`](packages/core/catalog/tools.json).

## Licencia

El código propio se distribuye bajo MIT. Cada dependencia conserva su licencia.
Véase [`LICENSE`](LICENSE).

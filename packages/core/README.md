# `@zutools/core`

Motores local-first de ZU Tools sin React ni dependencias de ejecución. Puede
utilizarse desde JavaScript, Angular, React, Web Workers o cualquier bundler ESM.

El paquete publicado contiene ESM compilado, source maps, declaraciones
TypeScript y el catálogo JSON dentro de `dist/`; los archivos fuente no forman
parte del tarball.

```js
import { csvToObjects, objectsToCsv } from '@zutools/core/csv';
import { utf8ToBase64 } from '@zutools/core/base64';
import { timestampToDate } from '@zutools/core/timestamp';
```

También se pueden importar todas las funciones desde `@zutools/core`, pero las
entradas por capacidad facilitan el tree-shaking y hacen explícito qué motor usa
una aplicación.

El paquete no muestra interfaces, no descarga archivos y no hace peticiones de
red. Las funciones de imagen de `@zutools/core/image` utilizan APIs del navegador
como Canvas, pero siguen siendo independientes del framework.

## Entradas

| Entrada | Contenido |
|---|---|
| `@zutools/core/base64` | texto, bytes, ArrayBuffer y Data URI |
| `@zutools/core/csv` | CSV ↔ objetos JavaScript |
| `@zutools/core/json` | parsear, formatear y minificar JSON |
| `@zutools/core/text` | transformaciones de mayúsculas y estilos |
| `@zutools/core/timestamp` | timestamps Unix y fechas |
| `@zutools/core/image` | carga, Canvas y generación de Blob |
| `@zutools/core/image-metadata` | lectura local de EXIF/PNG/WebP |
| `@zutools/core/catalog` | catálogo, selectores y validación |
| `@zutools/core/catalog.json` | catálogo JSON sin ejecutar JavaScript |

## Desarrollo

```bash
npm run build --workspace=@zutools/core
npm run test --workspace=@zutools/core
```

## Licencia

MIT.

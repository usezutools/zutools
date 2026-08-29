import { getActiveTools, toolsCatalog } from './catalog';
import { defaultToolRegistry } from './implementations/registry';
import ToolsPortal from './ToolsPortal';

export { ToolsPortal };
export default ToolsPortal;

/**
 * Creates the public Free catalogue from executable implementations.
 * Planned entries stay available in `toolsCatalog`, but are not advertised as
 * usable until their implementation is registered.
 */
export function createFreeCatalog(
  catalog = toolsCatalog,
  registry = defaultToolRegistry
) {
  const tools = getActiveTools(catalog)
    .filter((tool) => registry.has(tool.id))
    .map((tool) => Object.freeze({ ...tool, tier: 'free' }));
  const categoryIds = new Set(tools.map((tool) => tool.category));

  return Object.freeze({
    ...catalog,
    implementationScope: Object.freeze({
      ...catalog.implementationScope,
      phase: 'free',
      activeToolCount: tools.length,
      deferredToolCount: 0,
    }),
    categories: Object.freeze(
      catalog.categories
        .filter((category) => categoryIds.has(category.id))
        .map((category) => Object.freeze({ ...category }))
    ),
    tools: Object.freeze(tools),
  });
}

export const freeToolRegistry = defaultToolRegistry;
export const freeToolsCatalog = createFreeCatalog();

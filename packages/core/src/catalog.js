import defaultCatalog from '../catalog/tools.json' with { type: 'json' };

export const toolsCatalog = defaultCatalog;

export function getActiveTools(catalog = toolsCatalog) {
  return catalog.tools.filter(
    (tool) =>
      tool.status !== 'deferred' &&
      tool.execution === 'local'
  );
}

export function getToolById(toolId, catalog = toolsCatalog) {
  return catalog.tools.find((tool) => tool.id === toolId) || null;
}

export function getCategoriesWithCounts(catalog = toolsCatalog) {
  const activeTools = getActiveTools(catalog);
  return catalog.categories
    .map((category) => ({
      ...category,
      count: activeTools.filter((tool) => tool.category === category.id).length,
    }))
    .filter((category) => category.count > 0)
    .sort((a, b) => a.order - b.order);
}

export function validateToolsCatalog(catalog = toolsCatalog) {
  const errors = [];
  const categoryIds = new Set(catalog.categories?.map(({ id }) => id));
  const toolIds = new Set();

  if (!Array.isArray(catalog.categories)) errors.push('categories must be an array');
  if (!Array.isArray(catalog.tools)) errors.push('tools must be an array');
  if (errors.length) return errors;

  for (const tool of catalog.tools) {
    if (!tool.id) errors.push('Every tool must have an id');
    else if (toolIds.has(tool.id)) errors.push(`Duplicate tool id: ${tool.id}`);
    else toolIds.add(tool.id);

    if (!categoryIds.has(tool.category))
      errors.push(`Unknown category for ${tool.id || 'unnamed tool'}: ${tool.category}`);
  }

  return errors;
}

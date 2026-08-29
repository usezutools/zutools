import catalog from '../catalog/tools.json' with { type: 'json' };

const errors = [];
const categoryIds = new Set(catalog.categories.map(({ id }) => id));
const toolIds = new Set();

for (const tool of catalog.tools) {
  if (!tool.id) errors.push('Every tool must have an id');
  else if (toolIds.has(tool.id)) errors.push(`Duplicate tool id: ${tool.id}`);
  else toolIds.add(tool.id);

  if (!categoryIds.has(tool.category))
    errors.push(`Unknown category for ${tool.id || 'unnamed tool'}: ${tool.category}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Catalog valid: ${catalog.tools.length} tools in ${catalog.categories.length} categories.`
  );
}

export interface ToolDefinition {
  id: string;
  category: string;
  status?: string;
  execution?: string;
  [key: string]: unknown;
}

export interface ToolCategory {
  id: string;
  name: string;
  order: number;
  [key: string]: unknown;
}

export interface ToolsCatalog {
  categories: readonly ToolCategory[];
  tools: readonly ToolDefinition[];
  implementationScope?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

export const toolsCatalog: ToolsCatalog;
export function getActiveTools(catalog?: ToolsCatalog): ToolDefinition[];
export function getToolById(
  toolId: string,
  catalog?: ToolsCatalog
): ToolDefinition | null;
export function getCategoriesWithCounts(
  catalog?: ToolsCatalog
): Array<ToolCategory & { count: number }>;
export function validateToolsCatalog(catalog?: ToolsCatalog): string[];

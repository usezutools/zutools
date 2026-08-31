import { Base64Tool, CaseConverter, JsonCsvConverter, JsonFormatter } from './DataTools';
import { ImageConverter, MetadataRemover, ResizeImage } from './ImageTools';
import TimestampTool from './TimestampTool';
import WordCounter from './WordCounter';
import TextDiffChecker from './TextDiffChecker';
import { MergePdf, OrganizePdf, SplitPdf } from './PdfTools';

const implementations = {
  'merge-pdf': MergePdf,
  'organize-pdf': OrganizePdf,
  'split-pdf': SplitPdf,
  'json-formatter': JsonFormatter,
  'json-to-csv': JsonCsvConverter,
  base64: Base64Tool,
  'case-converter': CaseConverter,
  'word-counter': WordCounter,
  'text-diff-checker': TextDiffChecker,
  'unix-timestamp': TimestampTool,
  'webp-to-png': ImageConverter,
  'png-to-jpg': ImageConverter,
  'jpg-to-png': ImageConverter,
  'resize-image': ResizeImage,
  'image-metadata-remover': MetadataRemover,
};

export function createToolRegistry(entries = {}) {
  const registered = Object.freeze({ ...entries });

  return Object.freeze({
    implementations: registered,
    get(toolId) {
      return registered[toolId] || null;
    },
    has(toolId) {
      return Boolean(registered[toolId]);
    },
    ids: Object.freeze(Object.keys(registered)),
  });
}

export const defaultToolRegistry = createToolRegistry(implementations);

export function getToolImplementation(toolId) {
  return defaultToolRegistry.get(toolId);
}

export function isToolImplemented(toolId) {
  return defaultToolRegistry.has(toolId);
}

export const implementedToolIds = defaultToolRegistry.ids;

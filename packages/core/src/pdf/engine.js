// Thin adapter over @libpdf/core. Product policy lives here; PDF parsing,
// copying, extraction, page-tree mutation and serialization stay in LibPDF.
import { PDF, PdfArray, PdfDict, PdfRef, PdfStream, SecurityError } from '@libpdf/core';
import { fail, PdfToolError, validateRequest } from './contract.js';

const resolve = (pdf, value) => value instanceof PdfRef ? pdf.getObject(value) : value;
const refKey = ref => `${ref.objectNumber}:${ref.generation}`;
const pageInfo = page => ({ width: page.width, height: page.height, rotation: page.rotation });
const catalogHas = (pdf, key) => pdf.getCatalog().has(key);
const hasAccessibility = pdf => catalogHas(pdf, 'StructTreeRoot') || catalogHas(pdf, 'MarkInfo') ||
  pdf.getPages().some(page => page.dict.has('StructParents'));
const hasForms = pdf => catalogHas(pdf, 'AcroForm');
const hasDocumentStructures = pdf => [...pdf.getCatalog().keys()].some(key =>
  !['Type', 'Pages', 'Metadata', 'Lang', 'Version'].includes(key.value));

function hasSignature(pdf) {
  if (catalogHas(pdf, 'Perms')) return true;
  const acro = resolve(pdf, pdf.getCatalog().get('AcroForm'));
  if (!(acro instanceof PdfDict)) return false;
  const fields = resolve(pdf, acro.get('Fields'));
  if (!(fields instanceof PdfArray)) return false;
  const seen = new Set();
  function signed(raw) {
    const field = resolve(pdf, raw);
    if (!(field instanceof PdfDict) || seen.has(field)) return false;
    seen.add(field);
    if (resolve(pdf, field.get('FT'))?.value === 'Sig') return true;
    const kids = resolve(pdf, field.get('Kids'));
    return kids instanceof PdfArray && [...kids].some(signed);
  }
  return [...fields].some(signed);
}

function clearDocumentMetadata(pdf) {
  // Keep existing indirect object slots alive. LibPDF 0.4.1 can remap other
  // references incorrectly when garbage collection starts by removing object 1.
  // Emptying the native objects satisfies the blank-metadata policy without
  // changing the document graph.
  const trailer = pdf.context.info.trailer, infoRaw = trailer.get('Info'), info = resolve(pdf, infoRaw);
  if (info instanceof PdfDict) for (const key of [...info.keys()]) info.delete(key);
  else if (infoRaw instanceof PdfRef) pdf.context.info.registerAt(infoRaw, new PdfDict());
  else trailer.delete('Info');

  const catalog = pdf.getCatalog(), metadataRaw = catalog.get('Metadata'), metadata = resolve(pdf, metadataRaw);
  if (metadata instanceof PdfStream) metadata.setData(new Uint8Array());
  else if (metadataRaw instanceof PdfRef) pdf.context.info.registerAt(metadataRaw, new PdfStream());
  else catalog.delete('Metadata');
}

// LibPDF 0.4.1 has a documented copyPagesFrom regression for inherited page
// attributes. Materialize only the four inherited values before calling the
// native copier; callers' bytes remain untouched. Remove this shim when the
// pinned upstream version fixes the regression.
function materializeInheritedPageAttributes(pdf) {
  for (const page of pdf.getPages()) {
    for (const key of ['Resources', 'MediaBox', 'CropBox', 'Rotate']) {
      if (page.dict.has(key)) continue;
      let current = page.dict; const seen = new Set();
      while (current?.has('Parent')) {
        const raw = current.get('Parent'), id = raw instanceof PdfRef ? refKey(raw) : raw;
        if (seen.has(id) || seen.size >= 128) fail('INVALID_PDF', 'Invalid page inheritance.');
        seen.add(id); current = resolve(pdf, raw);
        if (!(current instanceof PdfDict)) fail('INVALID_PDF', 'Invalid page inheritance.');
        if (current.has(key)) { page.dict.set(key, current.get(key)); break; }
      }
    }
  }
}

function inspectDocument(pdf, limits) {
  const pages = pdf.getPages();
  if (!pages.length) fail('INVALID_PDF', 'The PDF has no pages.');
  if (pages.length > limits.maxPages) fail('LIMIT_EXCEEDED', 'The PDF has too many pages.');
  return {
    pages,
    features: {
      bookmarks: catalogHas(pdf, 'Outlines'),
      forms: hasForms(pdf),
      metadata: pdf.context.info.trailer.has('Info') || catalogHas(pdf, 'Metadata'),
      accessibilityTags: hasAccessibility(pdf),
    },
  };
}

function extractionWarnings(pdf, warnings) {
  if (catalogHas(pdf, 'Outlines')) warnings.push('BOOKMARKS_FOR_REMOVED_PAGES_OMITTED');
  if (hasDocumentStructures(pdf)) warnings.push('DOCUMENT_STRUCTURES_OMITTED_BY_NATIVE_EXTRACTION');
  if (hasAccessibility(pdf)) warnings.push('ACCESSIBILITY_TAGS_REMOVED');
}

async function nativeMerge(sources, options, warnings) {
  const later = sources.slice(1);
  const laterTagged = later.some(hasAccessibility);
  if (laterTagged && options.accessibility !== 'remove') {
    fail('ACCESSIBILITY_CONSENT_REQUIRED', 'Creating this result without its accessible reading structure requires confirmation.');
  }

  let out;
  if (options.accessibility === 'remove') {
    out = PDF.create(); clearDocumentMetadata(out);
    for (const source of sources) {
      materializeInheritedPageAttributes(source);
      await out.copyPagesFrom(source, source.getPages().map((_, index) => index), {
        includeAnnotations: true,
        includeStructure: false,
      });
    }
    if (sources.some(hasAccessibility)) warnings.push('ACCESSIBILITY_TAGS_REMOVED');
    if (sources.some(hasDocumentStructures)) warnings.push('DOCUMENT_STRUCTURES_OMITTED_BY_NATIVE_EXTRACTION');
  } else {
    [out] = sources;
    for (const source of later) {
      materializeInheritedPageAttributes(source);
      await out.copyPagesFrom(source, source.getPages().map((_, index) => index), {
        includeAnnotations: true,
        includeStructure: false,
      });
      if (hasDocumentStructures(source)) warnings.push('DOCUMENT_STRUCTURES_FROM_ADDITIONAL_INPUTS_OMITTED');
    }
  }
  clearDocumentMetadata(out);
  return out;
}

async function nativeOrganize(source, plan, options, warnings) {
  const count = source.getPageCount(), selected = plan.map(item => item.index);
  const isWholePermutation = selected.length === count && new Set(selected).size === count;
  if (!isWholePermutation || options.accessibility === 'remove') {
    if (hasAccessibility(source) && options.accessibility !== 'remove') {
      fail('ACCESSIBILITY_CONSENT_REQUIRED', 'Creating this result without its accessible reading structure requires confirmation.');
    }
    materializeInheritedPageAttributes(source);
    const out = await source.extractPages(selected, { includeAnnotations: true });
    plan.forEach((item, index) => out.getPages()[index].setRotation(
      /** @type {0|90|180|270} */ ((source.getPages()[item.index].rotation + item.rotation) % 360),
    ));
    extractionWarnings(source, warnings);
    return out;
  }

  materializeInheritedPageAttributes(source);
  const desiredRefs = selected.map(index => refKey(source.getPages()[index].ref));
  const originalRotations = new Map(source.getPages().map(page => [refKey(page.ref), page.rotation]));
  for (let target = 0; target < desiredRefs.length; target++) {
    const current = source.getPages().findIndex(page => refKey(page.ref) === desiredRefs[target]);
    if (current !== target) source.movePage(current, target);
  }
  plan.forEach((item, index) => {
    const page = source.getPages()[index], original = originalRotations.get(refKey(page.ref));
    page.setRotation(/** @type {0|90|180|270} */ ((original + item.rotation) % 360));
  });
  return source;
}

async function nativeSplit(source, groups, options, warnings) {
  const count = source.getPageCount();
  if (groups.length === 1 && groups[0].length === count && new Set(groups[0]).size === count) {
    return [await nativeOrganize(source, groups[0].map(index => ({ index, rotation: 0 })), options, warnings)];
  }
  if (hasAccessibility(source) && options.accessibility !== 'remove') {
    fail('ACCESSIBILITY_CONSENT_REQUIRED', 'Creating these results without their accessible reading structure requires confirmation.');
  }
  materializeInheritedPageAttributes(source);
  extractionWarnings(source, warnings);
  const outputs = [];
  for (const group of groups) outputs.push(await source.extractPages(group, { includeAnnotations: true }));
  return outputs;
}

async function saveAndVerify(pdf, expectedCount, limits) {
  const expected = pdf.getPages().map(pageInfo);
  const bytes = await pdf.save({ incremental: false, compressStreams: false, subsetFonts: false });
  if (bytes.length > limits.maxOutputBytes) fail('LIMIT_EXCEEDED', 'The output exceeds the byte limit.');
  const checked = await PDF.load(bytes);
  const actual = checked.getPages().map(pageInfo);
  if (actual.length !== expectedCount || actual.length !== expected.length) fail('VALIDATION_FAILED', 'The output page count changed during processing.');
  for (let index = 0; index < actual.length; index++) {
    if (actual[index].rotation !== expected[index].rotation ||
      Math.abs(actual[index].width - expected[index].width) > 1e-9 ||
      Math.abs(actual[index].height - expected[index].height) > 1e-9) {
      fail('VALIDATION_FAILED', 'The output page geometry changed during processing.');
    }
  }
  return bytes;
}

export async function runTool(toolId, inputs, plan, options = {}) {
  const job = validateRequest(toolId, inputs, plan, options.limits), started = performance.now();
  try {
    const sources = [];
    for (let index = 0; index < inputs.length; index++) {
      options.onProgress?.({ phase: 'checking-input', current: index + 1, total: inputs.length });
      const pdf = await PDF.load(inputs[index]);
      inspectDocument(pdf, job.limits); sources.push(pdf);
    }
    if (toolId === 'inspect') {
      const inspection = inspectDocument(sources[0], job.limits);
      return { pageCount: inspection.pages.length, pages: inspection.pages.map(pageInfo), features: inspection.features };
    }

    if (sources.some(hasSignature)) fail('UNSUPPORTED_DOCUMENT', 'Signed PDFs cannot be rewritten without invalidating their signatures.');

    const inputPageCount = sources.reduce((sum, pdf) => sum + pdf.getPageCount(), 0);
    const warnings = [];
    if (sources.some(pdf => pdf.recoveredViaBruteForce || pdf.warnings.length)) warnings.push('SOURCE_RECOVERED');
    let documents;
    if (toolId === 'merge-pdf') documents = [await nativeMerge(sources, options, warnings)];
    else if (toolId === 'organize-pdf') documents = [await nativeOrganize(sources[0], job.plan, options, warnings)];
    else documents = await nativeSplit(sources[0], job.plan, options, warnings);

    const results = []; let outputBytes = 0;
    for (const [index, document] of documents.entries()) {
      options.onProgress?.({ phase: 'checking-output', current: index + 1, total: documents.length });
      const expectedCount = toolId === 'split-pdf' ? job.plan[index].length :
        toolId === 'organize-pdf' ? job.plan.length : inputPageCount;
      const bytes = await saveAndVerify(document, expectedCount, { ...job.limits, maxOutputBytes: job.limits.maxOutputBytes - outputBytes });
      outputBytes += bytes.length;
      results.push({ name: toolId === 'split-pdf' ? `part-${index + 1}.pdf` : `${toolId}.pdf`, bytes, pageCount: expectedCount });
    }
    return { outputs: results, inputBytes: job.inputBytes, outputBytes, elapsedMs: performance.now() - started,
      validation: 'save-reload', warnings: [...new Set(warnings)] };
  } catch (error) {
    if (error instanceof PdfToolError) throw error;
    if (error instanceof SecurityError) fail('UNSUPPORTED_DOCUMENT', 'Encrypted PDF requires credentials that were not provided.');
    if (error instanceof RangeError) fail('INVALID_INPUT', 'A selected page does not exist.');
    fail('INVALID_PDF', 'The PDF operation could not be completed. The original is unchanged.');
  }
}

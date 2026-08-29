const TIFF_TAGS = {
  0x010e: 'Descripción',
  0x010f: 'Fabricante',
  0x0110: 'Modelo',
  0x0112: 'Orientación',
  0x011a: 'Resolución X',
  0x011b: 'Resolución Y',
  0x0128: 'Unidad de resolución',
  0x0131: 'Software',
  0x0132: 'Fecha de modificación',
  0x013b: 'Artista',
  0x8298: 'Copyright',
  0x829a: 'Exposición',
  0x829d: 'Apertura',
  0x8827: 'ISO',
  0x9003: 'Fecha original',
  0x9004: 'Fecha digitalización',
  0x9204: 'Compensación de exposición',
  0x9209: 'Flash',
  0x920a: 'Distancia focal',
  0xa002: 'Anchura original',
  0xa003: 'Altura original',
  0xa405: 'Distancia focal equivalente',
  0xa434: 'Objetivo',
  0xa435: 'Número de serie del objetivo',
  0xa431: 'Número de serie de cámara',
};

const ORIENTATION = {
  1: 'Normal',
  2: 'Espejo horizontal',
  3: 'Rotada 180°',
  4: 'Espejo vertical',
  5: 'Espejo horizontal y rotada 270°',
  6: 'Rotada 90°',
  7: 'Espejo horizontal y rotada 90°',
  8: 'Rotada 270°',
};

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function inBounds(view, offset, length = 1) {
  return offset >= 0 && length >= 0 && offset + length <= view.byteLength;
}

function cleanText(value) {
  return value.replace(/\0+$/g, '').trim();
}

function formatExifValue(tag, value) {
  if (tag === 0x0112 && ORIENTATION[value]) return ORIENTATION[value];
  if (tag === 0x829a && typeof value === 'number') return `${value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} s`;
  if (tag === 0x829d && typeof value === 'number') return `f/${value.toFixed(1).replace(/\.0$/, '')}`;
  if (tag === 0x920a && typeof value === 'number') return `${value.toFixed(1).replace(/\.0$/, '')} mm`;
  if (tag === 0xa405 && typeof value === 'number') return `${value} mm`;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function readTiffValue(view, entryOffset, tiffStart, littleEndian) {
  if (!inBounds(view, entryOffset, 12)) return null;
  const type = view.getUint16(entryOffset + 2, littleEndian);
  const count = view.getUint32(entryOffset + 4, littleEndian);
  const typeSize = TYPE_SIZE[type];
  if (!typeSize || count > 100_000) return null;
  const byteLength = typeSize * count;
  const valueOffset =
    byteLength <= 4
      ? entryOffset + 8
      : tiffStart + view.getUint32(entryOffset + 8, littleEndian);
  if (!inBounds(view, valueOffset, byteLength)) return null;

  if (type === 2) {
    const bytes = new Uint8Array(view.buffer, view.byteOffset + valueOffset, count);
    return cleanText(new TextDecoder('latin1').decode(bytes));
  }

  const values = [];
  for (let index = 0; index < count; index += 1) {
    const offset = valueOffset + index * typeSize;
    if (type === 1 || type === 7) values.push(view.getUint8(offset));
    else if (type === 3) values.push(view.getUint16(offset, littleEndian));
    else if (type === 4) values.push(view.getUint32(offset, littleEndian));
    else if (type === 9) values.push(view.getInt32(offset, littleEndian));
    else if (type === 5 || type === 10) {
      const numerator = type === 5 ? view.getUint32(offset, littleEndian) : view.getInt32(offset, littleEndian);
      const denominator = type === 5 ? view.getUint32(offset + 4, littleEndian) : view.getInt32(offset + 4, littleEndian);
      values.push(denominator === 0 ? 0 : numerator / denominator);
    }
  }
  return values.length === 1 ? values[0] : values;
}

function parseIfd(view, tiffStart, relativeOffset, littleEndian) {
  const offset = tiffStart + relativeOffset;
  if (!inBounds(view, offset, 2)) return { values: [], pointers: {} };
  const count = Math.min(view.getUint16(offset, littleEndian), 512);
  const values = [];
  const pointers = {};
  for (let index = 0; index < count; index += 1) {
    const entryOffset = offset + 2 + index * 12;
    if (!inBounds(view, entryOffset, 12)) break;
    const tag = view.getUint16(entryOffset, littleEndian);
    const value = readTiffValue(view, entryOffset, tiffStart, littleEndian);
    if (tag === 0x8769) pointers.exif = value;
    else if (tag === 0x8825) pointers.gps = value;
    else if (TIFF_TAGS[tag] && value !== null && value !== '') {
      values.push({ key: TIFF_TAGS[tag], value: formatExifValue(tag, value) });
    }
  }
  return { values, pointers };
}

function gpsDecimal(coordinates, reference) {
  if (!Array.isArray(coordinates) || coordinates.length < 3) return null;
  const decimal = coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600;
  return ['S', 'W'].includes(reference) ? -decimal : decimal;
}

function parseGpsIfd(view, tiffStart, relativeOffset, littleEndian) {
  const offset = tiffStart + Number(relativeOffset);
  if (!inBounds(view, offset, 2)) return [];
  const count = Math.min(view.getUint16(offset, littleEndian), 128);
  const gps = {};
  for (let index = 0; index < count; index += 1) {
    const entryOffset = offset + 2 + index * 12;
    if (!inBounds(view, entryOffset, 12)) break;
    const tag = view.getUint16(entryOffset, littleEndian);
    gps[tag] = readTiffValue(view, entryOffset, tiffStart, littleEndian);
  }
  const latitude = gpsDecimal(gps[2], gps[1]);
  const longitude = gpsDecimal(gps[4], gps[3]);
  const result = [];
  if (latitude !== null) result.push({ key: 'Latitud GPS', value: latitude.toFixed(6) });
  if (longitude !== null) result.push({ key: 'Longitud GPS', value: longitude.toFixed(6) });
  if (latitude !== null && longitude !== null) {
    result.push({ key: 'Coordenadas', value: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
  }
  if (typeof gps[6] === 'number') result.push({ key: 'Altitud GPS', value: `${gps[6].toFixed(1)} m` });
  return result;
}

export function parseExifTiff(buffer, tiffStart = 0) {
  const view = buffer instanceof DataView ? buffer : new DataView(buffer);
  if (!inBounds(view, tiffStart, 8)) return [];
  const byteOrder = String.fromCharCode(view.getUint8(tiffStart), view.getUint8(tiffStart + 1));
  const littleEndian = byteOrder === 'II';
  if (!littleEndian && byteOrder !== 'MM') return [];
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return [];
  const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const root = parseIfd(view, tiffStart, firstIfdOffset, littleEndian);
  let result = [...root.values];
  if (Number.isFinite(root.pointers.exif)) {
    result = result.concat(parseIfd(view, tiffStart, root.pointers.exif, littleEndian).values);
  }
  if (Number.isFinite(root.pointers.gps)) {
    result = result.concat(parseGpsIfd(view, tiffStart, root.pointers.gps, littleEndian));
  }
  return result;
}

function parseJpeg(view) {
  if (!inBounds(view, 0, 4) || view.getUint16(0) !== 0xffd8) return [];
  const result = [];
  let offset = 2;
  while (inBounds(view, offset, 4)) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda || marker === 0xd9) break;
    const length = view.getUint16(offset + 2);
    if (length < 2 || !inBounds(view, offset + 2, length)) break;
    if (
      marker === 0xe1 &&
      length >= 8 &&
      String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset + 4, 6)) === 'Exif\0\0'
    ) {
      result.push(...parseExifTiff(view, offset + 10));
    } else if (marker === 0xe1 && length > 30) {
      const bytes = new Uint8Array(view.buffer, view.byteOffset + offset + 4, length - 2);
      const prefix = new TextDecoder('latin1').decode(bytes.subarray(0, 29));
      if (prefix.startsWith('http://ns.adobe.com/xap/1.0/')) {
        const separator = bytes.indexOf(0);
        const text = new TextDecoder('utf-8').decode(bytes.subarray(separator + 1));
        result.push({ key: 'XMP', value: cleanText(text).slice(0, 500) || 'Bloque XMP incrustado' });
      }
    } else if (marker === 0xe2 && length > 13) {
      const prefix = new TextDecoder('latin1').decode(
        new Uint8Array(view.buffer, view.byteOffset + offset + 4, Math.min(12, length - 2))
      );
      if (prefix.startsWith('ICC_PROFILE')) result.push({ key: 'Perfil de color', value: 'Perfil ICC incrustado' });
    } else if (marker === 0xfe && length > 2) {
      const comment = cleanText(new TextDecoder('latin1').decode(
        new Uint8Array(view.buffer, view.byteOffset + offset + 4, length - 2)
      ));
      if (comment) result.push({ key: 'Comentario JPEG', value: comment.slice(0, 500) });
    }
    offset += length + 2;
  }
  return result;
}

function readPngText(view, offset, length) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  const separator = bytes.indexOf(0);
  if (separator < 0) return null;
  const decoder = new TextDecoder('latin1');
  return {
    key: cleanText(decoder.decode(bytes.subarray(0, separator))) || 'Texto PNG',
    value: cleanText(decoder.decode(bytes.subarray(separator + 1))).slice(0, 500),
  };
}

function readPngInternationalText(view, offset, length) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  const keywordEnd = bytes.indexOf(0);
  if (keywordEnd < 0 || keywordEnd + 2 >= bytes.length) return null;
  const decoder = new TextDecoder('utf-8');
  const keyword = cleanText(new TextDecoder('latin1').decode(bytes.subarray(0, keywordEnd))) || 'Texto PNG';
  const compressed = bytes[keywordEnd + 1] === 1;
  let cursor = keywordEnd + 3;
  const languageEnd = bytes.indexOf(0, cursor);
  if (languageEnd < 0) return null;
  cursor = languageEnd + 1;
  const translatedEnd = bytes.indexOf(0, cursor);
  if (translatedEnd < 0) return null;
  cursor = translatedEnd + 1;
  return {
    key: keyword,
    value: compressed
      ? 'Texto internacional comprimido incrustado'
      : cleanText(decoder.decode(bytes.subarray(cursor))).slice(0, 500),
  };
}

function parsePng(view) {
  if (!inBounds(view, 0, 8) || view.getUint32(0) !== 0x89504e47) return [];
  const result = [];
  let offset = 8;
  while (inBounds(view, offset, 12)) {
    const length = view.getUint32(offset);
    if (!inBounds(view, offset + 8, length)) break;
    const type = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset + 4, 4));
    const dataOffset = offset + 8;
    if (type === 'tEXt') {
      const value = readPngText(view, dataOffset, length);
      if (value?.value) result.push(value);
    } else if (type === 'iTXt') {
      const value = readPngInternationalText(view, dataOffset, length);
      if (value?.value) result.push(value);
    } else if (type === 'zTXt') {
      const bytes = new Uint8Array(view.buffer, view.byteOffset + dataOffset, length);
      const separator = bytes.indexOf(0);
      const keyword = separator >= 0
        ? cleanText(new TextDecoder('latin1').decode(bytes.subarray(0, separator)))
        : 'Texto PNG';
      result.push({ key: keyword || 'Texto PNG', value: 'Texto comprimido incrustado' });
    } else if (type === 'eXIf') {
      result.push(...parseExifTiff(view, dataOffset));
    } else if (type === 'tIME' && length >= 7) {
      const year = view.getUint16(dataOffset);
      const parts = Array.from({ length: 5 }, (_, index) => String(view.getUint8(dataOffset + 2 + index)).padStart(2, '0'));
      result.push({ key: 'Fecha PNG', value: `${year}-${parts[0]}-${parts[1]} ${parts[2]}:${parts[3]}:${parts[4]} UTC` });
    } else if (type === 'pHYs' && length >= 9) {
      result.push({ key: 'Densidad PNG', value: `${view.getUint32(dataOffset)} × ${view.getUint32(dataOffset + 4)} píxeles/metro` });
    } else if (type === 'iCCP') {
      result.push({ key: 'Perfil de color', value: 'Perfil ICC incrustado' });
    }
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return result;
}

function parseWebp(view) {
  if (!inBounds(view, 0, 12)) return [];
  const header = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset, 4));
  const format = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + 8, 4));
  if (header !== 'RIFF' || format !== 'WEBP') return [];
  const result = [];
  let offset = 12;
  while (inBounds(view, offset, 8)) {
    const type = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4));
    const length = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (!inBounds(view, dataOffset, length)) break;
    if (type === 'EXIF') {
      const exifHeader = length >= 6
        ? String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + dataOffset, 6))
        : '';
      result.push(...parseExifTiff(view, dataOffset + (exifHeader === 'Exif\0\0' ? 6 : 0)));
    } else if (type === 'XMP ') {
      const text = cleanText(new TextDecoder('utf-8').decode(new Uint8Array(view.buffer, view.byteOffset + dataOffset, length)));
      result.push({ key: 'XMP', value: text.slice(0, 500) || 'Bloque XMP incrustado' });
    } else if (type === 'ICCP') {
      result.push({ key: 'Perfil de color', value: 'Perfil ICC incrustado' });
    }
    offset += 8 + length + (length % 2);
  }
  return result;
}

function uniqueMetadata(entries) {
  const seen = new Set();
  return entries.filter(({ key, value }) => {
    const signature = `${key}:${value}`;
    if (!value || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

export async function extractImageMetadata(file, dimensions) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  let embedded = [];
  if (file.type === 'image/jpeg') embedded = parseJpeg(view);
  else if (file.type === 'image/png') embedded = parsePng(view);
  else if (file.type === 'image/webp') embedded = parseWebp(view);

  const basic = [
    { key: 'Nombre del archivo', value: file.name },
    { key: 'Formato', value: file.type || 'Desconocido' },
    { key: 'Tamaño', value: `${file.size.toLocaleString('es-ES')} bytes` },
  ];
  if (dimensions) basic.push({ key: 'Dimensiones', value: `${dimensions.width} × ${dimensions.height} px` });
  if (file.lastModified) basic.push({ key: 'Modificado en el dispositivo', value: new Date(file.lastModified).toLocaleString() });

  return {
    basic,
    embedded: uniqueMetadata(embedded),
  };
}

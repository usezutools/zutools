export interface ImageMetadataEntry {
  key: string;
  value: string;
}

export function parseExifTiff(
  buffer: ArrayBuffer | DataView,
  tiffStart?: number
): ImageMetadataEntry[];
export function extractImageMetadata(
  file: File,
  dimensions?: { width: number; height: number }
): Promise<{
  basic: ImageMetadataEntry[];
  embedded: ImageMetadataEntry[];
}>;

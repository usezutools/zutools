export function loadImage(file: Blob): Promise<{
  image: HTMLImageElement;
  url: string;
}>;
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type?: string,
  quality?: number
): Promise<Blob>;
export function renderImageToCanvas(
  image: CanvasImageSource,
  width: number,
  height: number,
  background?: string | null
): HTMLCanvasElement;

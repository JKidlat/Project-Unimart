/**
 * Inventory badge display helper & image compression/validation utilities.
 */

export type StockTier = 'plenty' | 'low' | 'critical' | 'empty';

export interface StockDisplay {
  label: string | null;
  isOutOfStock: boolean;
  tier: StockTier;
  count: number;
}

/**
 * Exact Unimart customer inventory visibility rules:
 * - >= 10 items: no stock indicator displayed (label = null)
 * - 6..9 items: "Few units left"
 * - 1..5 items: "<N> left" (e.g. "3 left")
 * - 0 items: "Out of stock"
 */
export function formatStockStatus(rawStock: number | string | null | undefined): StockDisplay {
  if (rawStock === undefined || rawStock === null || rawStock === '') {
    return { label: null, isOutOfStock: false, tier: 'plenty', count: 10 };
  }
  const count = Math.max(0, Number.isFinite(Number(rawStock)) ? Math.floor(Number(rawStock)) : 0);
  if (count >= 10) {
    return { label: null, isOutOfStock: false, tier: 'plenty', count };
  }
  if (count >= 6) {
    return { label: 'Few units left', isOutOfStock: false, tier: 'low', count };
  }
  if (count >= 1) {
    return { label: `${count} left`, isOutOfStock: false, tier: 'critical', count };
  }
  return { label: 'Out of stock', isOutOfStock: true, tier: 'empty', count: 0 };
}

export function isLegacyBlobUrl(url?: string | null): boolean {
  return Boolean(url && typeof url === 'string' && url.trim().toLowerCase().startsWith('blob:'));
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const MAX_RAW_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB before client optimization
const MAX_SERVER_BYTES = 5 * 1024 * 1024; // 5 MB after optimization

/**
 * Validates and compresses large product/avatar images on-device before multipart upload.
 */
export async function prepareImageForUpload(
  file: File,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.has((file.type || '').toLowerCase())) {
    throw new Error(`"${file.name}" is not a supported image format. Use JPG, PNG, WebP, or GIF.`);
  }
  if (file.size === 0) {
    throw new Error(`"${file.name}" appears to be empty.`);
  }
  if (file.size > MAX_RAW_UPLOAD_BYTES) {
    throw new Error(`"${file.name}" is larger than 10 MB. Please choose a smaller image.`);
  }

  // Keep animated GIFs intact unless oversized
  if (file.type === 'image/gif' && file.size <= MAX_SERVER_BYTES) {
    return file;
  }

  const maxDimension = options.maxDimension || 1280;
  const quality = options.quality || 0.84;

  try {
    const bitmapUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not decode selected image.'));
        image.src = bitmapUrl;
      });

      const longestSide = Math.max(img.width, img.height);
      const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
      const targetW = Math.max(1, Math.round(img.width * scale));
      const targetH = Math.max(1, Math.round(img.height * scale));

      // Skip canvas if small JPEG/WebP already fits comfortably
      if (scale === 1 && file.size <= 350 * 1024) {
        return file;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outputType, outputType === 'image/png' ? undefined : quality)
      );
      if (!blob) return file;
      if (blob.size > MAX_SERVER_BYTES) {
        const compactBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.72)
        );
        if (compactBlob && compactBlob.size <= MAX_SERVER_BYTES) {
          return new File([compactBlob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
        }
        throw new Error(`"${file.name}" remains above the 5 MB limit after compression. Please pick a smaller image.`);
      }
      const ext = outputType === 'image/png' ? '.png' : '.jpg';
      const normalizedName = file.name.includes('.') ? file.name.replace(/\.\w+$/, ext) : `${file.name}${ext}`;
      return new File([blob], normalizedName, { type: outputType });
    } finally {
      URL.revokeObjectURL(bitmapUrl);
    }
  } catch (err: any) {
    if (file.size <= MAX_SERVER_BYTES && ALLOWED_IMAGE_TYPES.has((file.type || '').toLowerCase())) {
      return file;
    }
    throw new Error(err?.message || 'Unable to process the selected image file.');
  }
}


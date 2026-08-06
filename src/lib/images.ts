const STORAGE_OBJECT_PATH = '/storage/v1/object/public/';
const STORAGE_RENDER_PATH = '/storage/v1/render/image/public/';

type ResizeOptions = {
  width: number;
  height: number;
  quality?: number;
};

// Supabase Storage's image-transformation endpoint serves a resized,
// recompressed copy instead of the original — thumbnails were downloading
// full-resolution posters (1-2MB+) even at a 140px card size. Only rewrites
// URLs that actually point at our own Storage buckets; anything else
// (external URLs, already-render URLs) passes through unchanged.
export function getResizedImageUrl(url: string | null, { width, height, quality = 75 }: ResizeOptions): string | null {
  if (!url || !url.includes(STORAGE_OBJECT_PATH)) return url;
  const renderUrl = url.replace(STORAGE_OBJECT_PATH, STORAGE_RENDER_PATH);
  return `${renderUrl}?width=${width}&height=${height}&resize=cover&quality=${quality}`;
}

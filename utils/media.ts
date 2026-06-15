export type MediaLike = {
  fileName?: string | null;
  mimeType?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
};

export const getVideoPosterUrl = (media: MediaLike) => media.thumbnailUrl || undefined;

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogg"];

const getPathname = (url: string) => {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.split("?")[0].toLowerCase();
  }
};

export const isVideoMedia = (media: MediaLike) => {
  if (media.mimeType?.toLowerCase().startsWith("video/")) {
    return true;
  }

  const filename = media.fileName?.toLowerCase() ?? "";
  if (VIDEO_EXTENSIONS.some((extension) => filename.endsWith(extension))) {
    return true;
  }

  if (!media.url) {
    return false;
  }

  const pathname = getPathname(media.url);
  return VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension));
};

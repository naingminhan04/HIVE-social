/**
 * Capture a poster frame from a video file for preview thumbnails.
 * Mobile Safari/Chrome often won't show the first frame from blob URLs alone.
 */
export async function captureVideoThumbnail(
  file: File,
  seekTime = 0.1,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      video.onloadeddata = null;
      video.onloadedmetadata = null;
      video.oncanplay = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (result: string | Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      cleanup();
      if (result instanceof Error) {
        reject(result);
        return;
      }
      resolve(result);
    };

    const drawFrame = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        finish(new Error("Video dimensions unavailable"));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish(new Error("Canvas not supported"));
        return;
      }

      try {
        ctx.drawImage(video, 0, 0, width, height);
        finish(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        finish(new Error("Failed to draw video frame"));
      }
    };

    const seekToFrame = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : seekTime;
      const target = duration > 0 ? Math.min(seekTime, Math.max(duration - 0.05, 0)) : 0;
      video.currentTime = target;
    };

    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        seekToFrame();
        return;
      }
      video.onloadeddata = seekToFrame;
    };

    video.onloadedmetadata = onReady;
    video.oncanplay = onReady;
    video.onseeked = drawFrame;
    video.onerror = () => finish(new Error("Failed to load video for thumbnail"));

    const timeoutId = window.setTimeout(() => {
      finish(new Error("Video thumbnail capture timed out"));
    }, 12_000);

    video.src = objectUrl;
    video.load();
  });
}

export async function createVideoPreviewUrl(file: File): Promise<string> {
  try {
    return await captureVideoThumbnail(file);
  } catch {
    return URL.createObjectURL(file);
  }
}

export function isVideoObjectUrl(url: string): boolean {
  return url.startsWith("blob:") && !url.startsWith("data:");
}

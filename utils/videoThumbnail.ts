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

    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (result: string | Error) => {
      if (settled) return;
      settled = true;
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

      ctx.drawImage(video, 0, 0, width, height);
      finish(canvas.toDataURL("image/jpeg", 0.82));
    };

    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : seekTime;
      video.currentTime = Math.min(seekTime, Math.max(duration - 0.1, 0));
    };

    video.onseeked = drawFrame;
    video.onerror = () => finish(new Error("Failed to load video for thumbnail"));
    video.src = objectUrl;
  });
}

export async function createVideoPreviewUrl(file: File): Promise<string> {
  try {
    return await captureVideoThumbnail(file);
  } catch {
    return URL.createObjectURL(file);
  }
}

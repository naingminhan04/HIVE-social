"use client";

import { useEffect, useState } from "react";

const cache = new Map<string, string>();

export function useVideoThumbnail(src: string | null | undefined): string | null {
  const [thumbnail, setThumbnail] = useState<string | null>(
    src ? (cache.get(src) ?? null) : null,
  );

  useEffect(() => {
    if (!src) return;
    if (cache.has(src)) {
      setThumbnail(cache.get(src)!);
      return;
    }

    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const capture = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        cache.set(src, dataUrl);
        if (!cancelled) setThumbnail(dataUrl);
      } catch {
      } finally {
        video.src = "";
      }
    };

    video.addEventListener("seeked", capture, { once: true });
    video.addEventListener(
      "loadedmetadata",
      () => {
        video.currentTime = 0.5;
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => {
        video.src = "";
      },
      { once: true },
    );

    video.src = src;

    return () => {
      cancelled = true;
      video.src = "";
    };
  }, [src]);

  return thumbnail;
}

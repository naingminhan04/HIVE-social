"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import OverlayPortal from "./OverlayPortal";

type ImageType = {
  id: string;
  url: string;
};

type Props = {
  images: ImageType[] | string;
  index?: number;
  onClose: () => void;
  onChange?: (index: number) => void;
};

const ImageViewer = ({ images, index, onClose, onChange }: Props) => {
  const normalizedImages: ImageType[] =
    typeof images === "string"
      ? [{ id: "single", url: images }]
      : images;

  const safeIndex = Math.max(
    0,
    Math.min(index ?? 0, normalizedImages.length - 1),
  );
  const image = normalizedImages[safeIndex];
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageBroken, setIsImageBroken] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useLockBodyScroll(true);

  useEffect(() => {
    setIsImageLoading(true);
    setIsImageBroken(false);
    setRetryKey(0);
  }, [safeIndex, image?.url]);

  if (!image) {
    return null;
  }

  const resolvedImageUrl = `${image.url}${image.url.includes("?") ? "&" : "?"}img_retry=${retryKey}`;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 backdrop-blur-2xl">
        <div className="fixed bottom-10 z-[121] flex h-10 w-20 items-center justify-center overflow-hidden rounded-full bg-black/20 text-black backdrop-blur-md dark:bg-white/10 dark:text-white">
          {safeIndex + 1}/{normalizedImages.length}
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[121] flex h-12 w-12 items-center justify-center rounded-full bg-black/20 text-black backdrop-blur-md hover:bg-black/50 hover:opacity-80 active:scale-90 dark:bg-white/10 dark:text-white dark:hover:bg-white/50"
        >
          <X size={28} />
        </button>

        {normalizedImages.length > 1 && safeIndex > 0 && (
          <button
            onClick={() => onChange?.(safeIndex - 1)}
            className="absolute left-4 z-[121] flex h-12 w-12 items-center justify-center rounded-full bg-black/20 text-black backdrop-blur-md hover:bg-black/50 hover:opacity-80 active:scale-90 dark:bg-white/10 dark:text-white dark:hover:bg-white/50"
          >
            <ChevronLeft size={36} />
          </button>
        )}

        <div className="relative h-dvh w-dvw">
          {isImageLoading && !isImageBroken && (
            <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/70">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur">
                <Loader2 size={20} className="animate-spin" />
              </span>
            </div>
          )}
          {isImageBroken && (
            <div className="absolute inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-black/75 text-white">
              <p className="text-sm text-white/80">This image could not be loaded.</p>
              <button
                type="button"
                onClick={() => {
                  setRetryKey((previous) => previous + 1);
                  setIsImageBroken(false);
                  setIsImageLoading(true);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <RefreshCw size={16} />
                Retry image
              </button>
            </div>
          )}
          <Image
            key={`${image.id}-${safeIndex}-${retryKey}`}
            src={resolvedImageUrl}
            alt="viewer"
            fill
            className={`object-contain transition-opacity duration-200 ${
              isImageLoading || isImageBroken ? "opacity-0" : "opacity-100"
            }`}
            priority
            onLoad={() => {
              setIsImageLoading(false);
              setIsImageBroken(false);
            }}
            onError={() => {
              setIsImageLoading(false);
              setIsImageBroken(true);
            }}
          />
        </div>

        {normalizedImages.length > 1 &&
          safeIndex < normalizedImages.length - 1 && (
            <button
              onClick={() => onChange?.(safeIndex + 1)}
              className="absolute right-4 z-[121] flex h-12 w-12 items-center justify-center rounded-full bg-black/20 text-black backdrop-blur-md hover:bg-black/50 hover:opacity-80 active:scale-90 dark:bg-white/10 dark:text-white dark:hover:bg-white/50"
            >
              <ChevronRight size={36} />
            </button>
          )}
      </div>
    </OverlayPortal>
  );
};

export default ImageViewer;

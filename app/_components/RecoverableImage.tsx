"use client";

import { RefreshCw } from "lucide-react";
import Image, { ImageProps } from "next/image";
import { useMemo, useState } from "react";

type RecoverableImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  wrapperClassName?: string;
  fallbackSrc?: string;
  showRetryButton?: boolean;
  showLoadingOverlay?: boolean;
  retryButtonClassName?: string;
  loadingOverlayClassName?: string;
  brokenOverlayClassName?: string;
};

type ImageState = {
  src?: string | null;
  retryKey: number;
  isLoading: boolean;
  useFallback: boolean;
  hasError: boolean;
};

const getInitialImageState = (src?: string | null): ImageState => ({
  src,
  retryKey: 0,
  isLoading: Boolean(src),
  useFallback: false,
  hasError: false,
});

const isLocalSrc = (src: string) => src.startsWith("/") && !src.startsWith("//");

const appendRetryParam = (src: string, retryKey: number) => {
  if (retryKey === 0 || isLocalSrc(src)) {
    return src;
  }

  return `${src}${src.includes("?") ? "&" : "?"}img_retry=${retryKey}`;
};

const RecoverableImage = ({
  src,
  alt,
  wrapperClassName = "",
  fallbackSrc,
  showRetryButton = false,
  showLoadingOverlay = false,
  retryButtonClassName = "",
  loadingOverlayClassName = "",
  brokenOverlayClassName = "",
  ...imageProps
}: RecoverableImageProps) => {
  const [storedImageState, setStoredImageState] = useState(() =>
    getInitialImageState(src),
  );
  const imageState =
    storedImageState.src === src ? storedImageState : getInitialImageState(src);

  const primarySrc = useMemo(
    () => (src ? appendRetryParam(src, imageState.retryKey) : null),
    [imageState.retryKey, src],
  );

  const activeSrc = imageState.useFallback ? fallbackSrc ?? null : primarySrc;
  const shouldRenderImage = Boolean(activeSrc) && !imageState.hasError;

  const handleRetry = () => {
    setStoredImageState({
      src,
      retryKey: imageState.retryKey + 1,
      isLoading: Boolean(src),
      useFallback: false,
      hasError: false,
    });
  };

  const handleError = () => {
    if (!imageState.useFallback && fallbackSrc) {
      setStoredImageState({
        ...imageState,
        src,
        useFallback: true,
        isLoading: true,
      });
      return;
    }

    setStoredImageState({
      ...imageState,
      src,
      hasError: true,
      isLoading: false,
    });
  };

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {shouldRenderImage ? (
        <Image
          {...imageProps}
          src={activeSrc!}
          alt={alt}
          onLoad={() => {
            setStoredImageState({
              ...imageState,
              src,
              isLoading: false,
              hasError: false,
            });
          }}
          onError={handleError}
        />
      ) : null}

      {showLoadingOverlay && imageState.isLoading && activeSrc && (
        <div
          className={`absolute inset-0 z-10 animate-pulse bg-gray-300 dark:bg-neutral-700 ${loadingOverlayClassName}`}
        />
      )}

      {(imageState.hasError || imageState.useFallback) && showRetryButton && src && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-sm ${brokenOverlayClassName}`}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleRetry();
            }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white transition hover:bg-white/25 active:scale-95 ${retryButtonClassName}`}
            aria-label="Retry image"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default RecoverableImage;

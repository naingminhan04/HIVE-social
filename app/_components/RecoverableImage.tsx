"use client";

import { RefreshCw } from "lucide-react";
import Image, { ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";

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

const appendRetryParam = (src: string, retryKey: number) =>
  `${src}${src.includes("?") ? "&" : "?"}img_retry=${retryKey}`;

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
  const [retryKey, setRetryKey] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(src));
  const [useFallback, setUseFallback] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setRetryKey(0);
    setIsLoading(Boolean(src));
    setUseFallback(false);
    setHasError(false);
  }, [src]);

  const primarySrc = useMemo(
    () => (src ? appendRetryParam(src, retryKey) : null),
    [retryKey, src],
  );

  const activeSrc = useFallback ? fallbackSrc ?? null : primarySrc;

  const handleRetry = () => {
    setRetryKey((previous) => previous + 1);
    setIsLoading(Boolean(src));
    setUseFallback(false);
    setHasError(false);
  };

  const handleError = () => {
    if (!useFallback && fallbackSrc) {
      setUseFallback(true);
      setIsLoading(true);
      return;
    }

    setHasError(true);
    setIsLoading(false);
  };

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {activeSrc ? (
        <Image
          {...imageProps}
          src={activeSrc}
          alt={alt}
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onError={handleError}
        />
      ) : null}

      {showLoadingOverlay && isLoading && activeSrc && (
        <div
          className={`absolute inset-0 z-10 animate-pulse bg-gray-300 dark:bg-neutral-700 ${loadingOverlayClassName}`}
        />
      )}

      {(hasError || useFallback) && showRetryButton && src && (
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

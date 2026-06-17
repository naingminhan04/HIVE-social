"use client";

import { RefreshCw } from "lucide-react";
import Image, { ImageProps } from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUserPresence } from "@/hooks/useUserPresence";

const MAX_AUTO_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

type RecoverableImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  wrapperClassName?: string;
  fallbackSrc?: string;
  showRetryButton?: boolean;
  showLoadingOverlay?: boolean;
  retryButtonClassName?: string;
  loadingOverlayClassName?: string;
  brokenOverlayClassName?: string;
  userId?: string;
  showOnlineStatus?: boolean;
  onlineStatusSize?: "sm" | "md" | "lg";
};

type ImageState = {
  src?: string | null;
  retryKey: number;
  autoRetryCount: number;
  isLoading: boolean;
  useFallback: boolean;
  hasError: boolean;
};

const getInitialImageState = (src?: string | null): ImageState => ({
  src,
  retryKey: 0,
  autoRetryCount: 0,
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
  userId,
  showOnlineStatus = false,
  onlineStatusSize = "md",
  ...imageProps
}: RecoverableImageProps) => {
  const [storedImageState, setStoredImageState] = useState(() =>
    getInitialImageState(src),
  );
  const imageState =
    storedImageState.src === src ? storedImageState : getInitialImageState(src);

  const { onlineUserIds, statuses, requestUserStatus } = useUserPresence();

  useEffect(() => {
    if (showOnlineStatus && userId && !statuses[userId]) {
      requestUserStatus(userId);
    }
  }, [showOnlineStatus, userId, statuses, requestUserStatus]);

  const isOnline = showOnlineStatus && userId ? (onlineUserIds.has(userId) || statuses[userId]?.isOnline) : false;

  const getImageClassName = () => {
    let base = imageProps.className || '';
    if (!showOnlineStatus || !userId) return base;
    
    const getBorderWidth = () => {
      switch (onlineStatusSize) {
        case 'sm': return 'border-2';
        case 'lg': return 'border-3';
        case 'md':
        default: return 'border-2';
      }
    };
    
    const colorClass = isOnline ? 'border-green-500' : 'border-neutral-400';
    const darkColorClass = isOnline ? 'dark:border-green-500' : 'dark:border-neutral-400';
    
    // If the image already has a border, change its color (handle dark mode)
    if (base.includes('border-')) {
      // Replace existing border color with status color (handle dark mode)
      if (isOnline) {
        base = base.replace(/border-(white|neutral-\d+|gray-\d+|black)/g, 'border-green-500');
        base = base.replace(/dark:border-(white|neutral-\d+|gray-\d+|black)/g, 'dark:border-green-500');
      } else {
        base = base.replace(/border-(white|green-\d+|gray-\d+|black)/g, 'border-neutral-400');
        base = base.replace(/dark:border-(white|green-\d+|gray-\d+|black)/g, 'dark:border-neutral-400');
      }
      // Also add color classes at end in case of arbitrary border widths
      base = `${base} ${colorClass} ${darkColorClass}`;
    } else {
      // If no border, add a status border
      const borderWidth = getBorderWidth();
      base = `${base} ${borderWidth} ${colorClass} ${darkColorClass}`;
    }
    return base;
  };

  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoRetryTimerRef.current !== null) {
        clearTimeout(autoRetryTimerRef.current);
      }
    };
  }, []);

  const primarySrc = useMemo(
    () => (src ? appendRetryParam(src, imageState.retryKey) : null),
    [imageState.retryKey, src],
  );

  const activeSrc = imageState.useFallback ? fallbackSrc ?? null : primarySrc;
  const shouldRenderImage = Boolean(activeSrc) && !imageState.hasError;

  const handleRetry = () => {
    if (autoRetryTimerRef.current !== null) {
      clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
    setStoredImageState({
      src,
      retryKey: imageState.retryKey + 1,
      autoRetryCount: 0,
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

    if (imageState.autoRetryCount < MAX_AUTO_RETRIES) {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, imageState.autoRetryCount);
      autoRetryTimerRef.current = setTimeout(() => {
        autoRetryTimerRef.current = null;
        setStoredImageState((prev) => ({
          ...prev,
          src,
          retryKey: prev.retryKey + 1,
          autoRetryCount: prev.autoRetryCount + 1,
          isLoading: Boolean(src),
          useFallback: false,
          hasError: false,
        }));
      }, delay);
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
    <div className={`relative ${wrapperClassName}`}>
      <div className="relative w-full h-full overflow-hidden">
        {shouldRenderImage ? (
          <Image
            {...imageProps}
            className={getImageClassName()}
            src={activeSrc!}
            alt={alt}
            onLoad={() => {
              if (autoRetryTimerRef.current !== null) {
                clearTimeout(autoRetryTimerRef.current);
                autoRetryTimerRef.current = null;
              }
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
    </div>
  );
};

export default RecoverableImage;

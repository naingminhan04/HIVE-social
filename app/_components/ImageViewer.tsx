"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import OverlayPortal from "./OverlayPortal";
import { isVideoMedia } from "@/utils/media";

type ImageType = {
  id: string;
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type Props = {
  images: ImageType[] | string;
  index?: number;
  onClose: () => void;
  onChange?: (index: number) => void;
  showPaginationOnVideo?: boolean;
  videoState?: {
    mediaId: string;
    currentTime: number;
    isPlaying: boolean;
  } | null;
  onVideoStateChange?: (state: {
    mediaId: string;
    currentTime: number;
    isPlaying: boolean;
  }) => void;
};

type ViewerState = {
  mediaKey: string;
  isImageLoading: boolean;
  isImageBroken: boolean;
  retryKey: number;
};

const getInitialViewerState = (mediaKey: string): ViewerState => ({
  mediaKey,
  isImageLoading: true,
  isImageBroken: false,
  retryKey: 0,
});

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const isLocalSrc = (src: string) => src.startsWith("/") && !src.startsWith("//");

const appendRetryParam = (src: string, retryKey: number) => {
  if (retryKey === 0 || isLocalSrc(src)) {
    return src;
  }
  return `${src}${src.includes("?") ? "&" : "?"}img_retry=${retryKey}`;
};

const ImageViewer = ({
  images,
  index,
  onClose,
  onChange,
  showPaginationOnVideo = false,
  videoState,
  onVideoStateChange,
}: Props) => {
  const normalizedImages: ImageType[] =
    typeof images === "string"
      ? [{ id: "single", url: images }]
      : images;

  const safeIndex = Math.max(
    0,
    Math.min(index ?? 0, normalizedImages.length - 1),
  );
  const image = normalizedImages[safeIndex];
  const mediaKey = `${safeIndex}-${image?.url ?? ""}`;
  const [storedViewerState, setStoredViewerState] = useState(() =>
    getInitialViewerState(mediaKey),
  );
  const viewerState =
    storedViewerState.mediaKey === mediaKey
      ? storedViewerState
      : getInitialViewerState(mediaKey);

  useLockBodyScroll(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const syncedPlaybackKeyRef = useRef<string | null>(null);
  const isVideo = image ? isVideoMedia(image) : false;

  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoIsPlaying, setVideoIsPlaying] = useState(false);
  const [videoIsMuted, setVideoIsMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (!isVideo) return;
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isVideo, resetHideTimer]);

  useEffect(() => {
    if (!isVideo || !videoRef.current || !image) return;
    if (!videoState || videoState.mediaId !== image.id) return;
    if (syncedPlaybackKeyRef.current === mediaKey) return;

    const video = videoRef.current;
    const duration = Number.isFinite(video.duration) ? video.duration : null;
    const nextTime =
      duration !== null
        ? Math.min(Math.max(videoState.currentTime, 0), Math.max(duration - 0.1, 0))
        : Math.max(videoState.currentTime, 0);

    if (Math.abs(video.currentTime - nextTime) > 0.4) {
      video.currentTime = nextTime;
    }

    if (videoState.isPlaying) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
    syncedPlaybackKeyRef.current = mediaKey;
  }, [image, isVideo, mediaKey, videoState]);

  useEffect(() => {
    if (!image) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && safeIndex > 0) {
        event.preventDefault();
        onChange?.(safeIndex - 1);
      }
      if (event.key === "ArrowRight" && safeIndex < normalizedImages.length - 1) {
        event.preventDefault();
        onChange?.(safeIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [image, onChange, safeIndex, normalizedImages.length]);

  if (!image) {
    return null;
  }

  const resolvedImageUrl = appendRetryParam(image.url, viewerState.retryKey);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
    resetHideTimer();
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.requestFullscreen().catch(() => {});
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setVideoIsMuted(video.muted);
    resetHideTimer();
  };

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#080808] text-white"
        onPointerMove={isVideo ? resetHideTimer : undefined}
        onPointerDown={isVideo ? resetHideTimer : undefined}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-[140] flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 active:scale-95"
          aria-label="Close media viewer"
        >
          <X size={24} />
        </button>

        {normalizedImages.length > 1 && safeIndex > 0 && (
          <button
            onClick={() => onChange?.(safeIndex - 1)}
            className="absolute left-3 z-[131] flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30 active:scale-95 md:left-5"
            aria-label="Previous media"
          >
            <ChevronLeft size={30} />
          </button>
        )}

        <div
          className={`relative h-dvh w-dvw ${isVideo ? "p-0" : "px-0 md:px-16"}`}
        >
          {viewerState.isImageLoading && !viewerState.isImageBroken && !isVideo && (
            <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/70">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur">
                <Loader2 size={20} className="animate-spin" />
              </span>
            </div>
          )}
          {viewerState.isImageBroken && (
            <div className="absolute inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-black/75 text-white">
              <p className="text-sm text-white/80">This image could not be loaded.</p>
              <button
                type="button"
                onClick={() => {
                  setStoredViewerState({
                    mediaKey,
                    retryKey: viewerState.retryKey + 1,
                    isImageBroken: false,
                    isImageLoading: true,
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <RefreshCw size={16} />
                Retry image
              </button>
            </div>
          )}

          <div className="relative h-full w-full">
            {isVideo ? (
              <div className="relative h-full w-full">
                <video
                  key={`${image.id}-${safeIndex}`}
                  ref={videoRef}
                  src={image.url}
                  className="h-full w-full cursor-pointer object-contain"
                  autoPlay
                  playsInline
                  preload="metadata"
                  onClick={togglePlayPause}
                  onTimeUpdate={(event) => {
                    setVideoCurrentTime(event.currentTarget.currentTime);
                    onVideoStateChange?.({
                      mediaId: image.id,
                      currentTime: event.currentTarget.currentTime,
                      isPlaying: !event.currentTarget.paused,
                    });
                  }}
                  onDurationChange={(event) => {
                    setVideoDuration(event.currentTarget.duration);
                  }}
                  onPlay={(event) => {
                    setVideoIsPlaying(true);
                    onVideoStateChange?.({
                      mediaId: image.id,
                      currentTime: event.currentTarget.currentTime,
                      isPlaying: true,
                    });
                  }}
                  onPause={(event) => {
                    setVideoIsPlaying(false);
                    onVideoStateChange?.({
                      mediaId: image.id,
                      currentTime: event.currentTarget.currentTime,
                      isPlaying: false,
                    });
                  }}
                />

                <div
                  className={`absolute inset-x-0 bottom-0 z-[130] flex items-center gap-3 px-4 pb-5 pt-10 transition-opacity duration-300 ${
                    controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
                  }}
                >
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="shrink-0 text-white transition active:scale-90"
                    aria-label={videoIsPlaying ? "Pause" : "Play"}
                  >
                    {videoIsPlaying ? (
                      <Pause size={22} fill="currentColor" />
                    ) : (
                      <Play size={22} fill="currentColor" />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={videoDuration || 1}
                    step={0.01}
                    value={videoCurrentTime}
                    onChange={(e) => {
                      const video = videoRef.current;
                      if (!video) return;
                      const t = Number(e.target.value);
                      video.currentTime = t;
                      setVideoCurrentTime(t);
                      resetHideTimer();
                    }}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/30 accent-white"
                    aria-label="Seek"
                  />

                  <span className="shrink-0 tabular-nums text-xs text-white/80">
                    {formatTime(videoCurrentTime)}&nbsp;/&nbsp;{formatTime(videoDuration)}
                  </span>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="shrink-0 text-white transition active:scale-90"
                    aria-label={videoIsMuted ? "Unmute" : "Mute"}
                  >
                    {videoIsMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleFullscreen}
                    className="shrink-0 text-white transition active:scale-90"
                    aria-label="Fullscreen"
                  >
                    <Maximize2 size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <Image
                key={`${image.id}-${safeIndex}-${viewerState.retryKey}`}
                src={resolvedImageUrl}
                alt="viewer"
                fill
                className={`object-contain transition-opacity duration-200 ${
                  viewerState.isImageLoading || viewerState.isImageBroken
                    ? "opacity-0"
                    : "opacity-100"
                }`}
                priority
                onLoad={() => {
                  setStoredViewerState({
                    ...viewerState,
                    mediaKey,
                    isImageLoading: false,
                    isImageBroken: false,
                  });
                }}
                onError={() => {
                  setStoredViewerState({
                    ...viewerState,
                    mediaKey,
                    isImageLoading: false,
                    isImageBroken: true,
                  });
                }}
              />
            )}
          </div>
        </div>

        {normalizedImages.length > 1 &&
          safeIndex < normalizedImages.length - 1 && (
            <button
              onClick={() => onChange?.(safeIndex + 1)}
              className="absolute right-3 z-[131] flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30 active:scale-95 md:right-5"
              aria-label="Next media"
            >
              <ChevronRight size={30} />
            </button>
          )}

        {normalizedImages.length > 1 && (!isVideo || showPaginationOnVideo) && (
          <div className="pointer-events-none absolute inset-x-0 top-1 z-[130] flex h-10 items-center justify-center gap-1 bg-transparent px-3">
            {normalizedImages.map((media, mediaIndex) => (
              <button
                key={`${media.id}-${mediaIndex}`}
                type="button"
                onClick={() => onChange?.(mediaIndex)}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                  mediaIndex === safeIndex ? "w-8 bg-white" : "w-3 bg-white/35"
                }`}
                aria-label={`Open media ${mediaIndex + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </OverlayPortal>
  );
};

export default ImageViewer;

"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Expand, Maximize, Minimize, Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";

type VideoPlayerProps = {
  src: string;
  autoPlay?: boolean;
  playsInline?: boolean;
  preload?: string;
  objectFit?: "contain" | "cover";
  className?: string;
  onExpand?: () => void;
  onPlay?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onPause?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  (
    {
      src,
      autoPlay = false,
      playsInline = true,
      preload = "metadata",
      objectFit = "contain",
      className = "",
      onExpand,
      onPlay,
      onPause,
      onTimeUpdate,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const volBarRef = useRef<HTMLDivElement>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const getVideo = (): HTMLVideoElement | null => {
      if (!ref || typeof ref === "function") return null;
      return ref.current;
    };

    const scheduleHide = useCallback(() => {
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }, []);

    const showAndScheduleHide = useCallback(() => {
      setShowControls(true);
      scheduleHide();
    }, [scheduleHide]);

    useEffect(() => {
      if (!isPlaying) {
        if (hideTimerRef.current !== null) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setShowControls(true);
      } else {
        scheduleHide();
      }
    }, [isPlaying, scheduleHide]);

    useEffect(() => () => {
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    }, []);

    useEffect(() => {
      const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
      document.addEventListener("fullscreenchange", handleFsChange);
      return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    const togglePlay = () => {
      const video = getVideo();
      if (!video) return;
      if (video.paused) void video.play().catch(() => {});
      else video.pause();
    };

    const toggleMute = () => {
      const video = getVideo();
      if (!video) return;
      const next = !video.muted;
      video.muted = next;
      setIsMuted(next);
    };

    const setVideoVolume = (val: number) => {
      const video = getVideo();
      if (!video) return;
      video.volume = val;
      video.muted = val === 0;
      setVolume(val);
      setIsMuted(val === 0);
    };

    const toggleFullscreen = async () => {
      const container = containerRef.current;
      if (!container) return;
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      else await container.requestFullscreen().catch(() => {});
    };

    const seekToFraction = (fraction: number) => {
      const video = getVideo();
      if (!video || !Number.isFinite(video.duration)) return;
      video.currentTime = Math.max(0, Math.min(fraction * video.duration, video.duration));
    };

    const fractionFromX = (clientX: number, bar: HTMLElement): number => {
      const rect = bar.getBoundingClientRect();
      return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    };

    const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      seekToFraction(fractionFromX(e.clientX, e.currentTarget));
      const handleMouseMove = (ev: MouseEvent) => {
        if (progressBarRef.current) seekToFraction(fractionFromX(ev.clientX, progressBarRef.current));
      };
      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const touch = e.touches[0];
      if (touch && progressBarRef.current) seekToFraction(fractionFromX(touch.clientX, progressBarRef.current));
      const handleTouchMove = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (t && progressBarRef.current) seekToFraction(fractionFromX(t.clientX, progressBarRef.current));
      };
      const handleTouchEnd = () => {
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    };

    const handleVolMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (volBarRef.current) setVideoVolume(fractionFromX(e.clientX, volBarRef.current));
      const handleMouseMove = (ev: MouseEvent) => {
        if (volBarRef.current) setVideoVolume(fractionFromX(ev.clientX, volBarRef.current));
      };
      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    const handleVolTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const touch = e.touches[0];
      if (touch && volBarRef.current) setVideoVolume(fractionFromX(touch.clientX, volBarRef.current));
      const handleTouchMove = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (t && volBarRef.current) setVideoVolume(fractionFromX(t.clientX, volBarRef.current));
      };
      const handleTouchEnd = () => {
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    };

    const progress = duration > 0 ? currentTime / duration : 0;
    const displayVolume = isMuted ? 0 : volume;

    const VolumeIcon = displayVolume === 0 ? VolumeX : displayVolume < 0.5 ? Volume1 : Volume2;

    return (
      <div
        ref={containerRef}
        className={`group relative bg-black ${className}`}
        onMouseMove={showAndScheduleHide}
        onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
        onTouchStart={showAndScheduleHide}
        style={{ cursor: showControls ? "default" : "none" }}
      >
        <video
          ref={ref}
          src={src}
          className={`h-full w-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
          autoPlay={autoPlay}
          playsInline={playsInline}
          preload={preload}
          onClick={(e) => { e.stopPropagation(); togglePlay(); showAndScheduleHide(); }}
          onPlay={(e) => { setIsPlaying(true); onPlay?.(e); }}
          onPause={(e) => { setIsPlaying(false); onPause?.(e); }}
          onTimeUpdate={(e) => { setCurrentTime(e.currentTarget.currentTime); onTimeUpdate?.(e); }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setIsPlaying(false)}
        />

        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 transition-opacity duration-200 ${
            showControls ? "opacity-100 pointer-events-auto" : "opacity-0"
          }`}
        >
          {/* Progress bar */}
          <div
            ref={progressBarRef}
            className="group/bar relative h-1 w-full cursor-pointer rounded-full bg-white/30 transition-all hover:h-2"
            onMouseDown={handleProgressMouseDown}
            onTouchStart={handleProgressTouchStart}
          >
            <div className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
              style={{ left: `calc(${progress * 100}% - 6px)` }}
            />
          </div>

          {/* Button row */}
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>

            {/* Timestamp */}
            <span className="min-w-[80px] text-xs tabular-nums text-white/75 select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-1">
              {/* Volume cluster */}
              <div
                className="group/vol flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-95"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  <VolumeIcon size={16} />
                </button>

                {/* Volume slider — expands on hover */}
                <div className="flex w-0 items-center overflow-hidden transition-all duration-200 group-hover/vol:w-20">
                  <div
                    ref={volBarRef}
                    className="group/vbar relative h-1 w-full cursor-pointer rounded-full bg-white/30 hover:h-2 transition-all"
                    onMouseDown={handleVolMouseDown}
                    onTouchStart={handleVolTouchStart}
                  >
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${displayVolume * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/vbar:opacity-100"
                      style={{ left: `calc(${displayVolume * 100}% - 6px)` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expand / Fullscreen */}
              {onExpand ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onExpand(); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-95"
                  aria-label="Open in viewer"
                >
                  <Expand size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void toggleFullscreen(); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-95"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;

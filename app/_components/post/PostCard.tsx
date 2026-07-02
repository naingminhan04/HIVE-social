"use client";

import { MouseEvent, useState } from "react";
import ImageViewer from "../common/ImageViewer";
import { PostImageType, PostType } from "@/types/post";
import PostContent from "./PostContent";
import PostMenu from "./PostMenu";
import ReactionBtn from "../common/ReactionBtn";
import { Share2, FileIcon, Play } from "lucide-react";
import ViewReaction from "../common/ViewReaction";
import { formatDate } from "@/utils/formatDate";
import CommentBtn from "../common/Comment";
import Link from "next/link";
import toast from "react-hot-toast";
import RecoverableImage from "../common/RecoverableImage";
import { getVideoPosterUrl, isVideoMedia } from "@/utils/media";

const PostCard = ({ post, view }: { post: PostType; view: boolean }) => {
  const images = post.images || [];
  const moreCount = images.length > 4 ? images.length - 4 : 0;
  const displayImages = images.slice(0, 4);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [videoPlayback, setVideoPlayback] = useState<
    Record<string, { currentTime: number; isPlaying: boolean }>
  >({});
  const [isDel, setIsDel] = useState(false);
  const timestamp = post.createdAt;
  const relativeTime = formatDate(timestamp);
  const shouldBlockProfileNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (view && typeof window !== "undefined" && window.innerWidth >= 768) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div
      className={`group bg-white dark:bg-neutral-900 border-2 border-white dark:border-neutral-900 relative rounded-xl transition-all 
      ${!view && "hover:bg-blue-100 dark:hover:bg-neutral-800"} 
      ${isDel && "opacity-50 pointer-events-none"}`}
    >
      {!view && (
        <Link
          href={`/posts/${post.id}`}
          prefetch={true}
          className="absolute inset-0 rounded-xl"
          aria-label="View post"
        />
      )}

      <div className="relative pointer-events-none">
        <div className="p-3 space-y-4">
          <div className="flex items-center gap-3 w-full">
            <div className="pointer-events-auto flex items-center gap-3">
              <Link
                href={`/users/${post.author.username}`}
                onClick={shouldBlockProfileNavigation}
              >
                <RecoverableImage
                  src={post.author.profilePic || "/default-avatar.png"}
                  alt={post.author.name}
                  width={100}
                  height={100}
                  className="w-12 h-12 hover:brightness-85 active:brightness-85 transition-all bg-gray-300 rounded-full object-cover"
                  wrapperClassName="h-12 w-12 rounded-full"
                  fallbackSrc="/default-avatar.png"
                  showRetryButton
                  retryButtonClassName="h-8 w-8"
                  userId={post.author.id}
                  showOnlineStatus
                  onlineStatusSize="sm"
                />
              </Link>
              <div>
                <Link
                  href={`/users/${post.author.username}`}
                  className="font-semibold flex gap-1"
                  onClick={shouldBlockProfileNavigation}
                >
                  <span className="hover:text-gray-500 dark:hover:text-gray-300 active:text-gray-500 dark:active:text-gray-300 transition-all">{post.author.name}</span>
                </Link>
                <p className="text-xs flex gap-1 text-gray-500 dark:text-gray-400 self-center">
                  {relativeTime}
                  {post.isEdited && <span>[Edited]</span>}
                </p>
              </div>
            </div>

            <div className="ml-auto pointer-events-auto">
              <PostMenu post={post} onDeletingChange={setIsDel} view={view} />
            </div>
          </div>

          <div className="whitespace-pre-line text-sm w-fit leading-relaxed pointer-events-auto">
            <PostContent post={post} view={view} />
          </div>

          {images.length > 0 && (
            <div
              className={`grid gap-1 pointer-events-auto ${getGridClass(
                images.length,
              )} min-h-90 sm:min-h-150 md:min-h-90 rounded-2xl overflow-hidden`}
            >
              {displayImages.map((img, index) => (
                <PostMediaTile
                  key={img.id}
                  media={img}
                  className={`${images.length === 3 && index === 2 ? "col-span-2" : ""
                    }`}
                  onOpen={() => {
                    setViewerIndex(index);
                    setViewerOpen(true);
                  }}
                  moreCount={index === 3 ? moreCount : 0}
                />
              ))}
            </div>
          )}

          {post.attachments && post.attachments.length > 0 && (
            <div className="pointer-events-auto border-t border-gray-200 dark:border-neutral-700 pt-3">
              <div className="space-y-2">
                {post.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg group hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <FileIcon size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate hover:underline">{attachment.fileName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{(attachment.fileSize / 1024).toFixed(1)} KB</p>
                    </a>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-blue-200 dark:hover:bg-blue-900 rounded text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all opacity-0 group-hover:opacity-100 text-xs"
                      aria-label={`Open ${attachment.fileName}`}
                    >
                      Open
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm p-1 border-t-2 border-gray-100 dark:border-gray-950 text-gray-500 dark:text-gray-400">
          <div className="flex items-center pointer-events-auto">
            <ReactionBtn post={post} />
            <CommentBtn post={post} view={view} />

            <div
              onClick={() => {
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_APP_URL}/posts/${post.id}`,
                );
                toast.success("Link copied to clipboard", {
                  id: `share-${post.id}`,
                  duration: 1000,
                });
              }}
              className="flex items-center gap-1 cursor-pointer px-2 h-10 hover:bg-blue-300 active:bg-blue-300 dark:hover:bg-neutral-500  dark:active:bg-neutral-500  hover:text-neutral-900 dark:hover:text-neutral-100 rounded-xl justify-center active:scale-95 "
            >
              <Share2 size={18} />
              {post.stats.sharedCount > 0 && (
                <span>{formatCount(post.stats.sharedCount)}</span>
              )}
            </div>
          </div>

          <div className="pointer-events-auto">
            <ViewReaction post={post} />
          </div>
        </div>
      </div>

      {viewerOpen && (
        <div className="z-100">
          <ImageViewer
            images={images}
            index={viewerIndex}
            onClose={() => setViewerOpen(false)}
            onChange={setViewerIndex}
            showPaginationOnVideo
            videoState={
              images[viewerIndex] ? {
                mediaId: images[viewerIndex].id,
                currentTime: videoPlayback[images[viewerIndex].id]?.currentTime ?? 0,
                isPlaying: videoPlayback[images[viewerIndex].id]?.isPlaying ?? false,
              } : null
            }
            onVideoStateChange={(state) => {
              setVideoPlayback((prev) => ({
                ...prev,
                [state.mediaId]: {
                  currentTime: state.currentTime,
                  isPlaying: state.isPlaying,
                },
              }));
            }}
          />
        </div>
      )}
    </div>
  );
};

function PostMediaTile({
  media,
  className,
  onOpen,
  moreCount,
}: {
  media: PostImageType;
  className?: string;
  onOpen: () => void;
  moreCount: number;
}) {
  const isVideo = isVideoMedia(media);
  const posterUrl = getVideoPosterUrl(media);

  return (
    <div
      onClick={() => onOpen()}
      className={`relative min-h-45 max-h-90 cursor-pointer overflow-hidden bg-black sm:min-h-45 sm:max-h-150 md:min-h-45 md:max-h-90 ${className ?? ""}`}
    >
      {isVideo ? (
        <>
          {posterUrl ? (
            <RecoverableImage
              src={posterUrl}
              fill
              sizes="(min-width: 1024px) 32vw, (min-width: 768px) 66vw, 100vw"
              alt="Video thumbnail"
              className="object-cover"
              wrapperClassName="h-full w-full bg-gray-300 dark:bg-neutral-700"
              showRetryButton
              showLoadingOverlay
              retryButtonClassName="h-12 w-12"
              brokenOverlayClassName="bg-black/35"
            />
          ) : (
            <video
              src={`${media.url}#t=0.01`}
              className="h-full w-full object-cover"
              preload="metadata"
              playsInline
              muted
              aria-hidden="true"
            />
          )}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-white">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55">
              <Play size={28} fill="currentColor" />
            </span>
          </div>
        </>
      ) : (
        <RecoverableImage
          src={media.url}
          fill
          sizes="(min-width: 1024px) 32vw, (min-width: 768px) 66vw, 100vw"
          alt="Post Image"
          className="object-cover"
          wrapperClassName="h-full w-full bg-gray-300 dark:bg-neutral-700"
          showRetryButton
          showLoadingOverlay
          retryButtonClassName="h-12 w-12"
          brokenOverlayClassName="bg-black/35"
        />
      )}

      {moreCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-bold text-white">
          +{moreCount}
        </div>
      )}
    </div>
  );
}

function getGridClass(length: number) {
  switch (length) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-rows-2";
    case 3:
      return "grid-cols-2 grid-rows-2";
    case 4:
    default:
      return "grid-cols-2 grid-rows-2";
  }
}

export function formatCount(num: number) {
  if (num < 1000) return num;
  return (num / 1000).toFixed(1).replace(".0", "") + "k";
}

export default PostCard;

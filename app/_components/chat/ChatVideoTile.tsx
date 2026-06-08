import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import type { ChatMedia } from "@/types/chat";

export function ChatVideoTile({ media, onOpen }: { media: ChatMedia; onOpen: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const src = media.url || media.thumbnailUrl || "";
  return (
    <button type="button" onClick={onOpen} className="relative block max-w-full overflow-hidden rounded-lg bg-black text-left">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 text-white">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
      <video src={src} className="max-h-80 w-full object-cover" preload="metadata" playsInline muted onLoadedData={() => setIsLoading(false)} onError={() => setIsLoading(false)} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55">
          <Play size={24} fill="currentColor" />
        </span>
      </div>
    </button>
  );
}

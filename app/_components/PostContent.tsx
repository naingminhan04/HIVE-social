"use client";

import { PostType } from "@/types/post";
import { useState } from "react";
import { useRouter } from "next/navigation";
import RichTextContent from "./RichTextContent";

const CONTENT_LIMIT = 200;

const PostContent = ({ post,view }: { post: PostType, view:boolean }) => {
  const [seeMore, setSeeMore] = useState(false);
  const router = useRouter();
  const content = post.content;
  const isLongContent = content.length > CONTENT_LIMIT;
  const showContent = seeMore && isLongContent;

  const toggleSeeMore = () => {
    setSeeMore((prev) => !prev);
  };

  return (
    <div
      onClick={(e)=>{if(isLongContent) {toggleSeeMore(); e.stopPropagation()}}}
      className={!view && isLongContent ? "cursor-pointer" : ""}
    >
      <RichTextContent
        text={view ? content : showContent ? content : content.slice(0, CONTENT_LIMIT)}
        onHashtagClick={(tag) => {
          router.push(`/search/${encodeURIComponent(tag)}`);
        }}
      />

      {isLongContent && !view && (
        <button
          className="text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-500 active:text-blue-800 dark:active:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            toggleSeeMore();
          }}
        >
          {seeMore ? <span className="px-2">See less</span> : "...See more"}
        </button>
      )}
    </div>
  );
};

export default PostContent;

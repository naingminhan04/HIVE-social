"use client";

import { useState } from "react";
import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { PostType } from "@/types/post";
import { deletePostAction } from "../_actions/postAction";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import EditPostForm from "./EditPostForm";
import toast from "react-hot-toast";

const PostMenu = ({ post,onDeletingChange,view }: { post: PostType, view: boolean;onDeletingChange: (v: boolean) => void; }) => {
  const queryClient = useQueryClient();
  const auth = useAuthStore();
  const user = auth.user?.id;
  const username = auth.user?.username?.trim();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [del, setDel] = useState(false);
  const [edit, setEdit] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await deletePostAction(post.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      if (username) {
        await queryClient.invalidateQueries({ queryKey: ["user", username] });
      }
      if (view) {
        router.back();
      }
      toast.success("Post Deleted Successfully");
    },
    onError: () => {
      toast.error("Couldn't Delete Post");
      onDeletingChange(false);
    },
  });


  const handleDel = () => {
    onDeletingChange(true);
    deleteMutation.mutate();
    setDel(false);
  };

  const isDeleting = deleteMutation.isPending;

  return (
    <>
        {user === post.author.id && (
          <div className="flex ">
            <button
              disabled={isDeleting}
              onClick={() => setOpen((p) => !p)}
              className="text-2xl flex justify-center hover:bg-blue-300 dark:hover:bg-neutral-500 active:bg-blue-300 dark:active:bg-neutral-400 rounded-2xl items-center w-10 h-8 active:scale-90 cursor-pointer disabled:opacity-50"
            >
              <Ellipsis />
            </button>

            {open && (
              <><div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 mt-2 z-50 w-48 rounded-xl backdrop-blur-2xl bg-white/60 dark:bg-black/40 shadow-lg"
              >
                <button
                  disabled={isDeleting}
                  onClick={() => {
                    setOpen(false);
                    setEdit(true);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-200 dark:hover:bg-neutral-950 active:scale-98 rounded-t-xl"
                >
                  Edit
                </button>

                <button
                  disabled={isDeleting}
                  onClick={() => {
                    setOpen(false);
                    setDel(true);
                  }}
                  className="w-full px-4 py-3 text-left text-red-500 hover:bg-gray-200 dark:hover:bg-neutral-950 active:scale-98 rounded-b-xl"
                >
                  Delete
                </button>
              </div></>
            )}

            {del && (
              <><div
                className="fixed inset-0 z-40"
                onClick={() => setDel(false)}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 z-50 w-48 rounded-xl backdrop-blur-2xl bg-white/40 dark:bg-black/40 shadow-lg"
              >
                <button
                  disabled={isDeleting}
                  onClick={handleDel}
                  className="w-full px-4 py-3 text-left text-red-500 hover:bg-gray-200 dark:hover:bg-neutral-950 active:scale-98 rounded-b-xl rounded-t-xl"
                >
                  Delete Permanently
                </button>

                <button
                  disabled={isDeleting}
                  onClick={() => setDel(false)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-200 dark:hover:bg-neutral-950 active:scale-98 rounded-b-xl"
                >
                  Cancel
                </button>
              </div></>
            )}

            {edit && (
              <EditPostForm post={post} onClose={() => setEdit(false)} />
            )}
          </div>
        )
      }
    </>
  );
};

export default PostMenu;

"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "nextjs-toploader/app";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

type FormValues = {
  keyword: string;
};

const SearchBtn = () => {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const router = useRouter();

  useLockBodyScroll(open);

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const value = data.keyword.trim();
    if (!value) return;
    setOpen(false);
    reset();
    router.push(`/search/${encodeURIComponent(value)}`);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 active:scale-90 flex justify-center items-center transition-all"
      >
        <Search />
      </button>

      {open && (
        <>
          <div
            onClick={handleClose}
            className="fixed lg:absolute inset-0 bg-black/20 dark:bg-black/40 z-50"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-100 dark:bg-neutral-900 absolute z-50 top-0 left-1/2 -translate-x-1/2 w-dvw max-w-md lg:max-w-full p-4 rounded-b-xl"
          >
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex justify-center items-center gap-2"
            >
              <input
                type="text"
                autoFocus
                placeholder="Search posts and users"
                className="flex-1 p-2 rounded w-full h-10 bg-white dark:bg-black border border-gray-300 dark:border-neutral-700 focus:border-black dark:focus:border-white"
                {...register("keyword")}
              />
              <button
                type="submit"
                className="px-4 h-10 bg-blue-300 dark:bg-neutral-700 hover:bg-blue-400 dark:hover:bg-neutral-600 active:bg-blue-400 dark:active:bg-neutral-600 active:scale-90 transition-all rounded"
              >
                <Search />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
};

export default SearchBtn;

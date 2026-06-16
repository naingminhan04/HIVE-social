import DummyPostCard from "../post/DummyPostCard";

const DummyProfile = ({ isPortal = false }: { isPortal?: boolean }) => {
  return (
    <main
      className={`relative w-full text-sm sm:text-base ${isPortal
          ? "bg-white dark:bg-neutral-900"
          : "lg:min-h-dvh min-h-[calc(100dvh-60px)]"
        }`}
    >
      <div
        className={`bg-white dark:bg-neutral-900 flex w-full z-10 justify-between h-14 px-3 items-center ${isPortal ? "border-b border-black/5 dark:border-white/10" : "sticky top-15 lg:top-0"
          }`}
      >
        <div className="flex items-center gap-2">
          {!isPortal && (
            <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-neutral-700" />
          )}
          <div className="w-48 h-8 rounded bg-gray-200 dark:bg-neutral-700" />
        </div>
        <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-neutral-700" />
      </div>

      <div className="bg-white dark:bg-neutral-900">
        <div className="animate-pulse">
          <div className="relative mb-[10vw] md:mb-[6vw] lg:mb-[clamp(10px,5vw,60px)]">
            <div className="w-full aspect-5/2 bg-gray-200 dark:bg-neutral-800" />

            <div className="absolute w-3/14 -bottom-2/9 left-1/10">
              <div className="w-full aspect-square rounded-full border-[1vw] md:border-[0.6vw] lg:border-[clamp(5px,1vw,7px)] border-white dark:border-neutral-900 bg-gray-100 dark:bg-neutral-800" />
            </div>
          </div>

          <section className="px-4 pb-4 space-y-5">
            <div className="flex justify-between">
              <div className="flex flex-col gap-3">
                <div className="h-5 w-[45vw] rounded-full bg-gray-200 dark:bg-neutral-800 md:w-[27vw] lg:w-[clamp(220px,22vw,280px)]" />
                <div className="h-3 w-[32vw] rounded-full bg-gray-100 dark:bg-neutral-800 md:w-[18vw] lg:w-[clamp(160px,16vw,210px)]" />
              </div>
              <div className="h-10 w-20 rounded-full bg-gray-100 dark:bg-neutral-800" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-black/5 bg-black/3 p-4 dark:border-white/10 dark:bg-white/3"
                >
                  <div className="h-5 w-10 rounded-full bg-gray-200 dark:bg-neutral-800" />
                  <div className="h-2.5 w-16 rounded-full bg-gray-100 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section
        className={`flex w-full flex-col gap-2 overflow-hidden bg-neutral-100 p-2 dark:bg-neutral-950 ${isPortal ? "px-0" : "lg:h-dvh h-[calc(100dvh-60px)]"
          }`}
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <DummyPostCard key={i} text={i === 0 ? 2 : 1} image={i === 1 ? 1 : 3} />
        ))}
      </section>
    </main>
  );
};

export default DummyProfile;

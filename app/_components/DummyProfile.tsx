import DummyPostCard from "./DummyPostCard";

const textOrder = [2, 2, 1, 1, 2];
const imageOrder = [3, 1, 4, 3, 2];

const DummyProfile = ({ isPortal = false }: { isPortal?: boolean }) => {
  return (
    <main
      className={`relative w-full text-sm sm:text-base ${
        isPortal
          ? "bg-white dark:bg-neutral-900"
          : "lg:min-h-dvh min-h-[calc(100dvh-60px)]"
      }`}
    >
      <div
        className={`bg-white dark:bg-neutral-900 flex w-full z-10 justify-between h-12 lg:h-15 px-2 items-center ${
          isPortal ? "border-b border-black/5 dark:border-white/10" : "sticky top-15 lg:top-0"
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
            <div className="w-full aspect-5/2 bg-gray-300 dark:bg-neutral-700" />

            <div className="absolute w-3/14 -bottom-2/9 left-1/10">
              <div className="w-full aspect-square rounded-full border-[1vw] md:border-[0.6vw] lg:border-[clamp(5px,1vw,7px)] border-white dark:border-neutral-900 bg-gray-200 dark:bg-neutral-700" />
            </div>
          </div>

          <section className="px-4 pb-5 space-y-6">
            <div className="flex justify-between">
              <div className="flex flex-col gap-2">
                <div className="w-[45vw] md:w-[27vw] lg:w-[clamp(250px,25vw,300px)] h-2/3 rounded bg-gray-200 dark:bg-neutral-700" />
                <div className="w-[35vw] md:w-[21vw] lg:w-[clamp(200px,20vw,250px)] h-1/3 rounded bg-gray-200 dark:bg-neutral-700" />
              </div>
              <div className="w-20 h-[14vw] md:h-[9vw] lg:h-[clamp(70px,4.5vw,80px)] rounded-lg bg-gray-200 dark:bg-neutral-700" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-black/5 dark:bg-white/3 border-black/5 dark:border-white/10 p-4 flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-6 rounded bg-gray-200 dark:bg-neutral-700" />
                  <div className="w-16 h-3 rounded bg-gray-200 dark:bg-neutral-700" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-black/10 dark:border-white/10 p-3 space-y-2"
                >
                  <div className="w-20 h-3 rounded bg-gray-200 dark:bg-neutral-700" />
                  <div className="w-full h-4 rounded bg-gray-200 dark:bg-neutral-700" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section
        className={`flex w-full flex-col gap-2 p-2 overflow-hidden ${
          isPortal ? "" : "md:px-0 lg:h-dvh h-[calc(100dvh-60px)]"
        }`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <DummyPostCard key={i} text={textOrder[i]} image={imageOrder[i]} />
        ))}
      </section>
    </main>
  );
};

export default DummyProfile;

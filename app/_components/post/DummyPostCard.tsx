
const DummyPostCard = ({
  text,
  image,
}:{text: number; image: number}) => {
  const textLines = Array.from({ length: text });
  const images = Array.from({ length: image });

  return (
    <div className="bg-white dark:bg-neutral-900 w-full rounded-2xl">
      <div className="animate-pulse p-4 space-y-4 "><div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-neutral-700" />

        <div className="flex-1 space-y-2">
          <div className="w-32 h-4 bg-gray-300 dark:bg-neutral-700 rounded-md" />
          <div className="w-20 h-3 bg-gray-400 dark:bg-neutral-800 rounded-md" />
        </div>
      </div>

      <div className="space-y-2">
        {textLines.map((_, index) => (
          <div
            key={index}
            className={`h-4 rounded-md bg-gray-400 dark:bg-neutral-800 ${
              index === 0 ? "w-full" : "w-5/6"
            }`}
          />
        ))}
      </div>

      <div
        className={`grid gap-1 ${getGridClass(images.length)} rounded-2xl overflow-hidden`}
      >
        {images.map((_, index) => (
          <div
            key={index}
            className={`bg-gray-300 dark:bg-neutral-700 ${
              images.length === 1 ? "h-72" : "h-40 sm:h-44 md:h-48"
            } ${images.length === 3 && index === 2 ? "col-span-2" : ""}`}
          />
        ))}
      </div>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <div className="w-6 h-4 bg-gray-300 dark:bg-neutral-700 rounded-md" />
          <div className="w-6 h-4 bg-gray-300 dark:bg-neutral-700 rounded-md" />
          <div className="w-6 h-4 bg-gray-300 dark:bg-neutral-700 rounded-md" />
        </div>
        <div className="flex">
          <div className="w-4 h-4 bg-gray-300 dark:bg-neutral-700 rounded-full" />
          <div className="w-4 h-4 bg-gray-300 dark:bg-neutral-700 rounded-full" />
          <div className="w-4 h-4 bg-gray-300 dark:bg-neutral-700 rounded-full" />
        </div>
      </div></div>
    </div>
  );
};

function getGridClass(length: number) {
  switch (length) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-2 grid-rows-2";
    default:
      return "grid-cols-2 grid-rows-2";
  }
}

export default DummyPostCard;

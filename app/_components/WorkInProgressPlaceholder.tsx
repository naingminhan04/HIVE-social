import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

type WorkInProgressPlaceholderProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

const WorkInProgressPlaceholder = ({
  title,
  description,
  icon: Icon = Construction,
}: WorkInProgressPlaceholderProps) => {
  return (
    <main className="min-h-[calc(100dvh-60px)] bg-neutral-100 px-2 py-8 dark:bg-neutral-950 lg:min-h-dvh">
      <div className="mx-auto flex min-h-[calc(100dvh-124px)] max-w-2xl items-center justify-center lg:min-h-[calc(100dvh-64px)]">
        <section className="w-full rounded-[2rem] border border-blue-100 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <Icon size={30} />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-blue-600 dark:text-blue-300">
            Work in progress
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-neutral-950 dark:text-white">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
            {description}
          </p>
        </section>
      </div>
    </main>
  );
};

export default WorkInProgressPlaceholder;

"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PointsTransactionsResponse } from "@/types/points";

type HistoryTabProps = {
  page: number;
  transactions?: PointsTransactionsResponse;
  isLoading: boolean;
  isFetching: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
};

const HistoryTab = ({
  page,
  transactions,
  isLoading,
  isFetching,
  onPrevPage,
  onNextPage,
}: HistoryTabProps) => {
  const hasTransactions = (transactions?.transactions.length ?? 0) > 0;
  const isContentRefreshing = isFetching && hasTransactions;

  return (
    <div className="rounded-[28px] border border-black/5 bg-neutral-50/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-950/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            Transaction history
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-950 dark:text-neutral-50">
            Page {page}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white/90 px-3 py-2 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
          {isContentRefreshing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} />
          )}
          {transactions?.transactions.length ?? 0}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={!transactions?.hasPrev || isFetching}
          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-blue-300 active:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:active:bg-black"
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <button
          type="button"
          onClick={onNextPage}
          disabled={!transactions?.hasNext || isFetching}
          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-blue-300 active:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:active:bg-black"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="relative mt-5 min-h-[280px] space-y-3">
        {isContentRefreshing && (
          <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/95 px-3 py-2 text-xs font-medium text-neutral-600 shadow-sm dark:border-white/10 dark:bg-neutral-900/95 dark:text-neutral-300">
              <Loader2 size={14} className="animate-spin" />
              Loading transactions...
            </div>
          </div>
        )}

        {isLoading && !hasTransactions ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            Loading transactions...
          </p>
        ) : hasTransactions ? (
          transactions?.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {transaction.type}
                </p>
                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  {transaction.type === "EARN" ? "+" : "-"}
                  {transaction.amount}
                </p>
              </div>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {new Date(transaction.createdAt).toLocaleString()}
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-100 p-3 text-xs text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
                {JSON.stringify(transaction.reason ?? {}, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            No transactions available yet.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={!transactions?.hasPrev || isFetching}
          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-blue-300 active:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:active:bg-black"
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <button
          type="button"
          onClick={onNextPage}
          disabled={!transactions?.hasNext || isFetching}
          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-blue-300 active:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:active:bg-black"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default HistoryTab;

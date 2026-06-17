"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PointsTransactionType } from "@/types/points";

type HistoryTabProps = {
  transactions: PointsTransactionType[];
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
};

const HistoryTab = ({
  transactions,
  isLoading,
  isFetching,
  page,
  totalPages,
  hasNext,
  hasPrev,
  onNextPage,
  onPrevPage,
}: HistoryTabProps) => {
  const hasTransactions = transactions.length > 0;

  if (isLoading && !hasTransactions) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ChevronLeft size={16} className="opacity-50" />
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Page {page} / {totalPages}
              </span>
              <ChevronRight size={16} className="opacity-50" />
            </div>
            {isFetching && <Loader2 className="animate-spin" size={16} />}
          </div>
        </div>
        <div className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} />
            <span className="text-neutral-500 dark:text-neutral-400 text-sm">
              Loading transactions...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!hasTransactions) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-white bg-white px-6 py-16 text-center dark:border-neutral-900 dark:bg-neutral-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-500/10 dark:text-blue-300">
          <ChevronDown size={24} />
        </div>
        <div>
          <p className="text-base font-medium text-neutral-800 dark:text-neutral-100">
            No transactions yet
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Your transaction history will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onPrevPage}
            disabled={!hasPrev || isFetching}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm font-semibold text-neutral-700 transition hover:bg-blue-300 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Page {page} / {totalPages}
            </span>
            {isFetching && <Loader2 className="animate-spin" size={16} />}
          </div>
          <button
            onClick={onNextPage}
            disabled={!hasNext || isFetching}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm font-semibold text-neutral-700 transition hover:bg-blue-300 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isFetching && (
        <div className="rounded-xl border-2 border-white bg-white py-4 text-center text-sm text-neutral-500 dark:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-400">
          <Loader2 className="animate-spin mx-auto mb-2" size={20} />
          Please wait...
        </div>
      )}

      {!isFetching && transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                {transaction.type}
              </p>
              <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                {new Date(transaction.createdAt).toLocaleString()}
              </p>
            </div>
            <p className={`shrink-0 text-sm font-semibold ${transaction.type === "EARN" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {transaction.type === "EARN" ? "+" : "-"}
              {transaction.amount}
            </p>
          </div>
          {transaction.reason && (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {typeof transaction.reason === "object"
                ? JSON.stringify(transaction.reason, null, 2)
                : String(transaction.reason)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

export default HistoryTab;

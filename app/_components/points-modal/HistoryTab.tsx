"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { PointsTransactionType } from "@/types/points";
import type { RefObject } from "react";

type HistoryTabProps = {
  transactions: PointsTransactionType[];
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
};

const HistoryTab = ({
  transactions,
  isLoading,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  sentinelRef,
}: HistoryTabProps) => {
  const hasTransactions = transactions.length > 0;

  if (isLoading && !hasTransactions) {
    return (
      <div className="flex flex-col gap-2">
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
      {isFetching && !isFetchingNextPage && (
        <div className="rounded-xl border-2 border-white bg-white py-4 text-center text-sm text-neutral-500 dark:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-400">
          <Loader2 className="animate-spin mx-auto mb-2" size={20} />
          Please wait...
        </div>
      )}

      {transactions.map((transaction) => (
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
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      {isFetchingNextPage ? (
        <div className="rounded-xl border-2 border-white bg-white py-4 text-center text-sm text-neutral-500 dark:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-400">
          <Loader2 className="animate-spin mx-auto mb-2" size={20} />
          Loading more transactions...
        </div>
      ) : !hasNextPage ? (
        <p className="py-4 text-center text-xs text-neutral-400">
          End of transaction history
        </p>
      ) : null}
    </div>
  );
};

export default HistoryTab;

"use client";

import { Loader2, Search } from "lucide-react";
import { PointsTransactionType } from "@/types/points";

type LookupTabProps = {
  transactionId: string;
  selectedTransaction: PointsTransactionType | null;
  isLookingUp: boolean;
  onTransactionIdChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const LookupTab = ({
  transactionId,
  selectedTransaction,
  isLookingUp,
  onTransactionIdChange,
  onSubmit,
}: LookupTabProps) => {
  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900"
      >
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
          <Search size={18} className="shrink-0" />
          <span className="min-w-0 truncate">Transaction Lookup</span>
        </div>
        <p className="mt-2 truncate text-sm text-neutral-500 dark:text-neutral-400">
          Search for a specific transaction without touching the transfer or
          claim actions.
        </p>

        <label className="mt-4 block text-sm text-neutral-700 dark:text-neutral-300">
          <span className="block truncate">Transaction ID</span>
          <input
            value={transactionId}
            onChange={(event) => onTransactionIdChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            placeholder="Transaction ID"
          />
        </label>

        <button
          type="submit"
          disabled={isLookingUp}
          className="mt-4 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-blue-300 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
        >
          {isLookingUp ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span className="min-w-0 truncate">Looking up...</span>
            </>
          ) : (
            <>
              <Search size={16} className="shrink-0" />
              <span className="min-w-0 truncate">Lookup</span>
            </>
          )}
        </button>
      </form>

      {selectedTransaction && (
        <div className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900">
          <div className="flex min-w-0 items-center justify-between gap-2 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            <span className="min-w-0 truncate">Transaction details</span>
            <span className="max-w-28 shrink-0 truncate rounded-full border border-black/10 bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300">
              {selectedTransaction.type}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
            <p className="truncate">
              <span className="font-semibold">ID:</span>{" "}
              <span>{selectedTransaction.id}</span>
            </p>
            <p className="truncate">
              <span className="font-semibold">Amount:</span>{" "}
              <span>{selectedTransaction.amount}</span>
            </p>
            <p className="truncate">
              <span className="font-semibold">Created:</span>{" "}
              <span>{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
            </p>
            <div>
              <span className="block truncate font-semibold">Reason:</span>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-neutral-100 p-3 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {JSON.stringify(selectedTransaction.reason ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookupTab;

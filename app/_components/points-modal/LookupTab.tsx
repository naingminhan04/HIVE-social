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
    <div className="mx-auto max-w-2xl space-y-4">
      <form
        onSubmit={onSubmit}
        className="rounded-[28px] border border-black/5 bg-neutral-50/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-950/80"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
          <Search size={18} />
          Transaction Lookup
        </div>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Search for a specific transaction without touching the transfer or
          claim actions.
        </p>

        <label className="mt-4 block text-sm text-neutral-700 dark:text-neutral-300">
          Transaction ID
          <input
            value={transactionId}
            onChange={(event) => onTransactionIdChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            placeholder="Transaction ID"
          />
        </label>

        <button
          type="submit"
          disabled={isLookingUp}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-300 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
        >
          {isLookingUp ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Looking up...
            </>
          ) : (
            <>
              <Search size={16} />
              Lookup
            </>
          )}
        </button>
      </form>

      {selectedTransaction && (
        <div className="rounded-[28px] border border-black/5 bg-neutral-50/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-950/80">
          <div className="flex items-center justify-between gap-2 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            <span>Transaction details</span>
            <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-xs text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
              {selectedTransaction.type}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
            <p>
              <span className="font-semibold">ID:</span>{" "}
              {selectedTransaction.id}
            </p>
            <p>
              <span className="font-semibold">Amount:</span>{" "}
              {selectedTransaction.amount}
            </p>
            <p>
              <span className="font-semibold">Created:</span>{" "}
              {new Date(selectedTransaction.createdAt).toLocaleString()}
            </p>
            <div>
              <span className="font-semibold">Reason:</span>
              <pre className="mt-2 overflow-x-auto rounded-2xl bg-white p-3 text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
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

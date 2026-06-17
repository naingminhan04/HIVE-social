"use client";

import { Loader2, Send } from "lucide-react";

type TransferTabProps = {
  recipient: string;
  transferAmount: string;
  currentPoints: number;
  isTransferring: boolean;
  onRecipientChange: (value: string) => void;
  onTransferAmountChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const TransferTab = ({
  recipient,
  transferAmount,
  currentPoints,
  isTransferring,
  onRecipientChange,
  onTransferAmountChange,
  onSubmit,
}: TransferTabProps) => {
  return (
    <div className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900">
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
        <Send size={18} className="shrink-0" />
        <span className="min-w-0 truncate">Transfer Points</span>
      </div>
      <p className="mt-2 truncate text-sm text-neutral-500 dark:text-neutral-400">
        Send points to another user without affecting your daily claim or
        transaction lookup state.
      </p>

      <div className="mt-4 rounded-xl border border-black/10 bg-neutral-100 p-4 dark:border-white/10 dark:bg-neutral-800">
        <p className="truncate text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
          Available balance
        </p>
        <p className="mt-2 truncate text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
          {currentPoints}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label className="block text-sm text-neutral-700 dark:text-neutral-300">
          <span className="block truncate">Recipient username</span>
          <input
            value={recipient}
            onChange={(event) => onRecipientChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            placeholder="Recipient username"
          />
        </label>

        <label className="block text-sm text-neutral-700 dark:text-neutral-300">
          <span className="block truncate">Points amount</span>
          <input
            value={transferAmount}
            onChange={(event) => onTransferAmountChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            placeholder="0"
            inputMode="numeric"
          />
        </label>

        <button
          type="submit"
          disabled={isTransferring}
          className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-blue-300 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
        >
          {isTransferring ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span className="min-w-0 truncate">Transferring...</span>
            </>
          ) : (
            <>
              <Send size={16} className="shrink-0" />
              <span className="min-w-0 truncate">Transfer</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TransferTab;

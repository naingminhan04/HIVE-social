"use client";

import { Gift, History, Info, Loader2, ShieldCheck } from "lucide-react";
import {
  PointsDailyLoginInfoResponse,
  PointsTransactionSummaryType,
} from "@/types/points";

type OverviewTabProps = {
  currentPoints: number;
  dailyInfo?: PointsDailyLoginInfoResponse;
  summary?: PointsTransactionSummaryType;
  formattedLastClaim: string;
  isClaiming: boolean;
  isInfoLoading: boolean;
  isSummaryLoading: boolean;
  onClaimDaily: () => void;
  onOpenHistory: () => void;
};

const OverviewTab = ({
  currentPoints,
  dailyInfo,
  summary,
  formattedLastClaim,
  isClaiming,
  isInfoLoading,
  isSummaryLoading,
  onClaimDaily,
  onOpenHistory,
}: OverviewTabProps) => {
  const isDailyDisabled = isClaiming || isInfoLoading || !dailyInfo?.canClaim;

  return (
    <div className="grid w-full max-w-full gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-[28px] border border-black/5 bg-neutral-50/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-950/80 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400 sm:tracking-[0.2em]">
              Your balance
            </p>
            <p className="mt-2 truncate text-[clamp(2rem,9cqw,2.5rem)] font-semibold text-neutral-950 dark:text-neutral-50">
              {currentPoints}
            </p>
          </div>
          <button
            type="button"
            onClick={onClaimDaily}
            disabled={isDailyDisabled}
            className="inline-flex min-w-0 max-w-full shrink-0 items-center gap-2 rounded-2xl bg-blue-300 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
          >
            {isClaiming ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span className="min-w-0 truncate">Claiming...</span>
              </>
            ) : dailyInfo?.canClaim ? (
              <span className="min-w-0 truncate">Claim Daily</span>
            ) : (
              <span className="min-w-0 truncate">Already Claimed</span>
            )}
            <Gift size={16} className="shrink-0" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Streak", value: dailyInfo?.streak ?? "-" },
            {
              label: "Remaining Balance",
              value: dailyInfo?.remainingBalance ?? "-",
            },
            { label: "Points Earned", value: dailyInfo?.pointsEarned ?? "-" },
            {
              label: "Available Today",
              value: dailyInfo?.pointsAvailable ?? "-",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900"
            >
              <p className="truncate text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {item.label}
              </p>
              <p className="mt-2 truncate text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {isInfoLoading ? "Loading..." : item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            <Info size={16} className="shrink-0" />
            <span className="min-w-0 truncate">Last claim</span>
          </div>
          <p className="mt-2 truncate text-sm text-neutral-500 dark:text-neutral-400">
            {isInfoLoading ? "Loading..." : formattedLastClaim}
          </p>
        </div>
      </div>

      <div className="min-w-0 rounded-[28px] border border-black/5 bg-neutral-50/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-950/80 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400 sm:tracking-[0.2em]">
              Transaction summary
            </p>
            <p className="mt-2 truncate text-lg font-semibold text-neutral-950 dark:text-neutral-50">
              {isSummaryLoading ? "Loading..." : "Latest totals"}
            </p>
          </div>
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-white/90 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300 sm:w-auto sm:gap-2 sm:px-3 sm:py-2">
            <ShieldCheck size={16} />
            <span className="hidden sm:inline">secure</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {[
            {
              label: "Earned",
              value: summary?.totalEarned ?? "-",
              tone: "bg-neutral-100 dark:bg-neutral-900",
            },
            {
              label: "Spent",
              value: summary?.totalSpent ?? "-",
              tone: "bg-neutral-100 dark:bg-neutral-900",
            },
            {
              label: "Balance",
              value: summary?.currentBalance ?? "-",
              tone: "bg-neutral-100 dark:bg-neutral-900",
            },
            {
              label: "Transactions",
              value: summary?.transactionCount ?? "-",
              tone: "bg-neutral-100 dark:bg-neutral-900",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border border-black/5 p-4 shadow-sm dark:border-white/10 ${item.tone}`}
            >
              <p className="truncate text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                {item.label}
              </p>
              <p className="mt-2 truncate text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {isSummaryLoading ? "Loading..." : item.value}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenHistory}
          className="mt-4 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-blue-300 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:active:bg-black"
        >
          <History size={16} className="shrink-0" />
          <span className="min-w-0 truncate">Transaction History</span>
        </button>
      </div>
    </div>
  );
};

export default OverviewTab;

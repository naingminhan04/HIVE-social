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
      <div className="min-w-0 rounded-[28px] border border-black/5 bg-neutral-50/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-950/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              Your balance
            </p>
            <p className="mt-2 text-4xl font-semibold text-neutral-950 dark:text-neutral-50">
              {currentPoints}
            </p>
          </div>
          <button
            type="button"
            onClick={onClaimDaily}
            disabled={isDailyDisabled}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-300 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
          >
            {isClaiming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : dailyInfo?.canClaim ? (
              "Claim Daily"
            ) : (
              "Already Claimed"
            )}
            <Gift size={16} />
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
              <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {isInfoLoading ? "Loading..." : item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            <Info size={16} />
            Last claim
          </div>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {isInfoLoading ? "Loading..." : formattedLastClaim}
          </p>
        </div>
      </div>

      <div className="min-w-0 rounded-[28px] border border-black/5 bg-neutral-50/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-950/80">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              Transaction summary
            </p>
            <p className="mt-2 text-lg font-semibold text-neutral-950 dark:text-neutral-50">
              {isSummaryLoading ? "Loading..." : "Latest totals"}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white/90 px-3 py-2 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
            <ShieldCheck size={16} />
            secure
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
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {isSummaryLoading ? "Loading..." : item.value}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenHistory}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-blue-300 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:active:bg-black"
        >
          <History size={16} />
          Transaction History
        </button>
      </div>
    </div>
  );
};

export default OverviewTab;

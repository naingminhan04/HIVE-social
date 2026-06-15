"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, History, Loader2, Search, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  dailyLoginAction,
  getDailyLoginInfoAction,
  getPointTransactionByIdAction,
  getPointsTransactionsAction,
  getPointsTransactionsSummaryAction,
  transferPointsAction,
} from "@/app/_actions/points";
import {
  PointsDailyLoginInfoResponse,
  PointsTransactionSummaryType,
  PointsTransactionsResponse,
  PointsTransactionType,
} from "@/types/points";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import OverviewTab from "./points-modal/OverviewTab";
import HistoryTab from "./points-modal/HistoryTab";
import TransferTab from "./points-modal/TransferTab";
import LookupTab from "./points-modal/LookupTab";
import OverlayPortal from "./layout/OverlayPortal";

type PointsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserPoints: number;
  onPointsUpdated: (points: number) => void;
};

type PointsTab = "overview" | "history" | "transfer" | "lookup";

const tabs: {
  id: PointsTab;
  label: string;
  icon: typeof Coins;
}[] = [
    { id: "overview", label: "Overview", icon: Coins },
    { id: "history", label: "History", icon: History },
    { id: "transfer", label: "Transfer", icon: Send },
    { id: "lookup", label: "Lookup", icon: Search },
  ];

const TabLoadingState = ({ label }: { label: string }) => (
  <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-black/5 bg-neutral-50/80 dark:border-white/10 dark:bg-neutral-950/80">
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200">
        <Loader2 size={20} className="animate-spin" />
      </span>
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Loading {label}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Please wait a moment.
        </p>
      </div>
    </div>
  </div>
);

const PointsModal = ({
  isOpen,
  onClose,
  currentUserPoints,
  onPointsUpdated,
}: PointsModalProps) => {
  const [activeTab, setActiveTab] = useState<PointsTab>("overview");
  const [currentPoints, setCurrentPoints] = useState(currentUserPoints);
  const [page, setPage] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<PointsTransactionType | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: dailyInfo,
    isLoading: isInfoLoading,
    refetch: refetchDailyInfo,
  } = useQuery<PointsDailyLoginInfoResponse>({
    queryKey: ["pointsInfo"],
    queryFn: async () => {
      const response = await getDailyLoginInfoAction();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isOpen,
    staleTime: 1000 * 60,
    retry: false,
  });

  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery<PointsTransactionSummaryType>({
    queryKey: ["pointsSummary"],
    queryFn: async () => {
      const response = await getPointsTransactionsSummaryAction();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isOpen,
    staleTime: 1000 * 60,
    retry: false,
  });

  const {
    data: transactions,
    isLoading: isTransactionsLoading,
    isFetching: isTransactionsFetching,
    refetch: refetchTransactions,
  } = useQuery<PointsTransactionsResponse>({
    queryKey: ["pointsTransactions", page],
    queryFn: async () => {
      const response = await getPointsTransactionsAction({ page, limit: 5 });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isOpen,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60,
    retry: false,
  });

  useEffect(() => {
    setCurrentPoints(currentUserPoints);
  }, [currentUserPoints]);

  useEffect(() => {
    if (typeof summary?.currentBalance !== "number") return;

    setCurrentPoints((previousPoints) =>
      previousPoints === summary.currentBalance
        ? previousPoints
        : summary.currentBalance,
    );

    if (currentUserPoints !== summary.currentBalance) {
      onPointsUpdated(summary.currentBalance);
    }
  }, [currentUserPoints, onPointsUpdated, summary?.currentBalance]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("overview");
      setPage(1);
      setRecipient("");
      setTransferAmount("");
      setTransactionId("");
      setSelectedTransaction(null);
      setIsClaiming(false);
      setIsTransferring(false);
      setIsLookingUp(false);
    }
  }, [isOpen]);

  useLockBodyScroll(isOpen);

  const refreshPointsData = async (
    options: {
      dailyInfo?: boolean;
      summary?: boolean;
      transactions?: boolean;
    } = { dailyInfo: true, summary: true, transactions: true },
  ) => {
    const tasks: Promise<unknown>[] = [];

    if (options.dailyInfo) {
      tasks.push(refetchDailyInfo());
      tasks.push(queryClient.invalidateQueries({ queryKey: ["pointsInfo"] }));
    }

    if (options.summary) {
      tasks.push(refetchSummary());
      tasks.push(queryClient.invalidateQueries({ queryKey: ["pointsSummary"] }));
    }

    if (options.transactions) {
      tasks.push(refetchTransactions());
      tasks.push(
        queryClient.invalidateQueries({ queryKey: ["pointsTransactions"] }),
      );
    }

    await Promise.all(tasks);
  };

  const handleClaimDaily = async () => {
    setIsClaiming(true);
    const toastId = toast.loading("Claiming daily points...");

    try {
      const result = await dailyLoginAction();
      if (!result.success) {
        throw new Error(result.error);
      }

      const earned = result.data.points;
      const newBalance = currentPoints + earned;
      setCurrentPoints(newBalance);
      onPointsUpdated(newBalance);

      await refreshPointsData();

      toast.success(result.data.message || `You claimed ${earned} points!`, {
        id: toastId,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to claim daily points.",
        { id: toastId },
      );
    } finally {
      setIsClaiming(false);
    }
  };

  const handleTransfer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedRecipient = recipient.trim();
    const amount = Number(transferAmount);

    if (!trimmedRecipient || Number.isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid recipient and points amount.");
      return;
    }

    if (amount > currentPoints) {
      toast.error("You do not have enough points to transfer.");
      return;
    }

    setIsTransferring(true);
    const toastId = toast.loading("Transferring points...");

    try {
      const result = await transferPointsAction({
        points: amount,
        recipient: trimmedRecipient,
      });
      if (!result.success) {
        throw new Error(result.error);
      }

      const newBalance = currentPoints - amount;
      setCurrentPoints(newBalance);
      onPointsUpdated(newBalance);
      setRecipient("");
      setTransferAmount("");

      await refreshPointsData({
        dailyInfo: false,
        summary: true,
        transactions: true,
      });

      toast.success(
        result.data.message ||
        `Transferred ${amount} points to ${trimmedRecipient}.`,
        { id: toastId },
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to transfer points.",
        { id: toastId },
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const handleLookupTransaction = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const trimmedTransactionId = transactionId.trim();

    if (!trimmedTransactionId) {
      toast.error("Enter a transaction ID to lookup.");
      return;
    }

    setIsLookingUp(true);
    const toastId = toast.loading("Looking up transaction...");

    try {
      const result = await getPointTransactionByIdAction(trimmedTransactionId);
      if (!result.success) {
        throw new Error(result.error);
      }

      setSelectedTransaction(result.data);
      toast.success("Transaction details loaded.", { id: toastId });
    } catch (error) {
      setSelectedTransaction(null);
      toast.error(
        error instanceof Error ? error.message : "Unable to lookup transaction.",
        { id: toastId },
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  const formattedLastClaim = useMemo(() => {
    if (!dailyInfo?.lastClaimDate) {
      return "Never claimed";
    }

    return new Date(dailyInfo.lastClaimDate).toLocaleString();
  }, [dailyInfo?.lastClaimDate]);

  if (!isOpen) {
    return null;
  }

  const isOverviewTabLoading = isInfoLoading || isSummaryLoading;
  const isInitialHistoryLoading = isTransactionsLoading && !transactions;

  return (
    <OverlayPortal>
      <div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md">
        <div className="@container/points flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-neutral-900/95">
          <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between gap-4 border-b border-black/5 bg-white/90 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-neutral-900/90">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-neutral-950 dark:text-neutral-50">
                Points Center
              </h2>
              <p className="hidden truncate text-sm text-neutral-500 dark:text-neutral-400 md:block">
                Claim rewards, review history, transfer points, and lookup
                transactions.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-black/5 bg-white/80 p-2 text-neutral-600 transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
            >
              <X size={18} />
            </button>
          </div>

          <div className="shrink-0 border-b border-black/5 px-4 py-4 dark:border-white/10 sm:px-5">
            <div className="flex gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-w-0 flex-1 items-center justify-center rounded-2xl border px-3 py-3 text-sm font-semibold transition sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${activeTab === tab.id
                        ? "border-blue-400 bg-blue-400 text-white shadow-sm dark:border-black dark:bg-black dark:text-white"
                        : "border-black/5 bg-neutral-50 text-neutral-600 hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                      }`}
                  >
                    <span
                      className={`shrink-0 rounded-xl p-2 shadow-sm ${activeTab === tab.id
                          ? "bg-white/20 text-white dark:bg-neutral-900 dark:text-white"
                          : "bg-white text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                        }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="hidden min-w-0 truncate sm:inline">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-none overscroll-contain sm:p-5">
            {activeTab === "overview" &&
              (isOverviewTabLoading ? (
                <TabLoadingState label="overview" />
              ) : (
                <OverviewTab
                  currentPoints={currentPoints}
                  dailyInfo={dailyInfo}
                  summary={summary}
                  formattedLastClaim={formattedLastClaim}
                  isClaiming={isClaiming}
                  isInfoLoading={isInfoLoading}
                  isSummaryLoading={isSummaryLoading}
                  onClaimDaily={handleClaimDaily}
                  onOpenHistory={() => setActiveTab("history")}
                />
              ))}

            {activeTab === "history" &&
              (isInitialHistoryLoading ? (
                <TabLoadingState label="history" />
              ) : (
                <HistoryTab
                  page={page}
                  transactions={transactions}
                  isLoading={isTransactionsLoading}
                  isFetching={isTransactionsFetching}
                  onNextPage={() => setPage((prev) => prev + 1)}
                  onPrevPage={() => setPage((prev) => Math.max(prev - 1, 1))}
                />
              ))}

            {activeTab === "transfer" && (
              <TransferTab
                recipient={recipient}
                transferAmount={transferAmount}
                currentPoints={currentPoints}
                isTransferring={isTransferring}
                onRecipientChange={setRecipient}
                onTransferAmountChange={setTransferAmount}
                onSubmit={handleTransfer}
              />
            )}

            {activeTab === "lookup" && (
              <LookupTab
                transactionId={transactionId}
                selectedTransaction={selectedTransaction}
                isLookingUp={isLookingUp}
                onTransactionIdChange={setTransactionId}
                onSubmit={handleLookupTransaction}
              />
            )}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
};

export default PointsModal;

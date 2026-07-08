"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, History, Loader2, Search, Send, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "nextjs-toploader/app";
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
import { useAuthStore } from "@/store/auth";
import OverviewTab from "@/app/_components/points-modal/OverviewTab";
import HistoryTab from "@/app/_components/points-modal/HistoryTab";
import TransferTab from "@/app/_components/points-modal/TransferTab";
import LookupTab from "@/app/_components/points-modal/LookupTab";

type PointsTab = "overview" | "history" | "transfer" | "lookup";

const PAGE_SIZE = 10;

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
  <div className="flex min-h-80 items-center justify-center rounded-xl border-2 border-white bg-white dark:border-neutral-900 dark:bg-neutral-900">
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200">
        <Loader2 size={20} className="animate-spin" />
      </span>
      <div>
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Loading {label}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Please wait a moment.
        </p>
      </div>
    </div>
  </div>
);

export default function PointsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PointsTab>("overview");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const historySentinelRef = useRef<HTMLDivElement | null>(null);
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<PointsTransactionType | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [currentPoints, setCurrentPoints] = useState(user?.points ?? 0);

  const {
    data: dailyInfo,
    isLoading: isInfoLoading,
    refetch: refetchDailyInfo,
  } = useQuery<PointsDailyLoginInfoResponse>({
    queryKey: ["pointsInfo"],
    queryFn: async () => {
      const result = await getDailyLoginInfoAction();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
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
      const result = await getPointsTransactionsSummaryAction();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 1000 * 60,
    retry: false,
  });

  const {
    data: transactionsData,
    isLoading: isTransactionsLoading,
    isFetching: isTransactionsFetching,
    isFetchingNextPage: isTransactionsFetchingNextPage,
    hasNextPage: hasMoreTransactions,
    fetchNextPage: fetchNextTransactionsPage,
    refetch: refetchTransactions,
  } = useInfiniteQuery<PointsTransactionsResponse>({
    queryKey: ["pointsTransactions"],
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;
      const result = await getPointsTransactionsAction({ page, limit: PAGE_SIZE });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    staleTime: 1000 * 60,
    retry: false,
  });

  const transactions =
    transactionsData?.pages.flatMap((transactionPage) => transactionPage.transactions) ?? [];

  useEffect(() => {
    if (user?.points !== undefined) {
      setCurrentPoints(user.points);
    }
  }, [user?.points]);

  useEffect(() => {
    if (typeof summary?.currentBalance !== "number") return;

    setCurrentPoints((previousPoints) =>
      previousPoints === summary.currentBalance
        ? previousPoints
        : summary.currentBalance,
    );

    if (user && user.points !== summary.currentBalance) {
      setUser({ ...user, points: summary.currentBalance });
    }
  }, [user, setUser, summary?.currentBalance]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "history") return;
    const sentinel = historySentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasMoreTransactions && !isTransactionsFetchingNextPage) {
          void fetchNextTransactionsPage();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    activeTab,
    fetchNextTransactionsPage,
    hasMoreTransactions,
    isTransactionsFetchingNextPage,
  ]);

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
      if (user) {
        setUser({ ...user, points: newBalance });
      }

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
      if (user) {
        setUser({ ...user, points: newBalance });
      }
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

  const isOverviewTabLoading = isInfoLoading || isSummaryLoading;
  const isInitialHistoryLoading = isTransactionsLoading && transactions.length === 0;

  return (
    <div className="md:px-2">
      <main className="flex min-h-dvh w-full flex-col bg-neutral-100 dark:bg-neutral-950 lg:min-h-dvh">
        <div
          className="z-30 flex h-15 w-full justify-between bg-white/95 font-semibold backdrop-blur dark:bg-neutral-900/95 sticky top-15 items-center border-b border-black/5 px-3 dark:border-white/10 lg:top-0"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              onClick={handleBack}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100 active:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700"
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-400 text-white dark:bg-white dark:text-black">
              <Coins size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm text-neutral-950 dark:text-neutral-50 sm:text-base">
                Points Center
              </span>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                Claim rewards & track your points
              </p>
            </div>
          </div>
        </div>

        <div className="sticky top-30 z-20 border-b border-black/5 bg-neutral-100/95 px-1.5 py-1.5 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 md:px-0 lg:top-15">
          <div className="grid h-12 grid-cols-4 gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-12 min-w-0 items-center justify-center rounded-xl border px-2 text-sm font-semibold transition sm:gap-2 sm:px-3 ${activeTab === tab.id
                    ? "border-blue-400 bg-blue-400 text-white shadow-sm dark:border-black dark:bg-black dark:text-white"
                    : "border-white bg-white text-neutral-600 hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                    }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm ${activeTab === tab.id
                      ? "bg-white/20 text-white dark:bg-neutral-900 dark:text-white"
                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                      }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="hidden min-w-0 truncate md:inline">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={contentRef}
          className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-2 bg-neutral-100 px-1.5 dark:bg-neutral-950 md:px-0"
        >
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
                transactions={transactions}
                isLoading={isTransactionsLoading}
                isFetching={isTransactionsFetching}
                isFetchingNextPage={isTransactionsFetchingNextPage}
                hasNextPage={hasMoreTransactions}
                sentinelRef={historySentinelRef}
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
      </main>
    </div>
  );
};

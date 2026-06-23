import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import type {
  PointsDailyLoginInfoResponse,
  PointsTransactionSummaryType,
  PointsTransactionType,
} from "./points";

export type PointsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserPoints: number;
  onPointsUpdated: (points: number) => void;
};

export type PointsTab = "overview" | "history" | "transfer" | "lookup";

export type PointsTabItem = {
  id: PointsTab;
  label: string;
  icon: LucideIcon;
};

export type OverviewTabProps = {
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

export type HistoryTabProps = {
  transactions: PointsTransactionType[];
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
};

export type TransferTabProps = {
  recipient: string;
  transferAmount: string;
  currentPoints: number;
  isTransferring: boolean;
  onRecipientChange: (value: string) => void;
  onTransferAmountChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export type LookupTabProps = {
  transactionId: string;
  selectedTransaction: PointsTransactionType | null;
  isLookingUp: boolean;
  onTransactionIdChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

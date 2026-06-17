import {
  differenceInDays,
  differenceInMinutes,
  format,
  formatDistanceToNowStrict,
} from "date-fns";

import { enUS } from "date-fns/locale";

const shortEn = {
  ...enUS,
  formatDistance: (token: string, count: number) => {
    const map: Record<string, string> = {
      xSeconds: `${count}s`,
      xMinutes: `${count}m`,
      xHours: `${count}h`,
      xDays: `${count}d`,
    };

    return map[token] ?? `${count}`;
  },
};

export function formatDate(
  date: string,
  addSuffix: boolean = true,
  short: boolean = false
) {
  const createdAt = new Date(date);
  const daysAgo = differenceInDays(new Date(), createdAt);

  if (daysAgo >= 7) {
    return format(createdAt, "MMM d, yyyy");
  }

  return formatDistanceToNowStrict(createdAt, {
    addSuffix,
    locale: short ? shortEn : undefined,
  });
}

// Just show time for inside bubbles
export function formatChatTimestamp(date: string) {
  const createdAt = new Date(date);
  return format(createdAt, "h:mm a");
}

// Check if we should show date pill between messages
export function shouldShowTimestamp(prevDate: string | null, currentDate: string): boolean {
  if (!prevDate) return true; // First message, always show
  const prev = new Date(prevDate);
  const curr = new Date(currentDate);
  return prev.toDateString() !== curr.toDateString();
}

// For date pill and scroll overlay
export function formatScrollOverlayTimestamp(date: string) {
  const createdAt = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const daysAgo = differenceInDays(today, createdAt);

  if (createdAt.toDateString() === today.toDateString()) {
    return "Today";
  } else if (createdAt.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else if (daysAgo < 7) {
    return format(createdAt, "EEE"); // Mon, Tue, etc.
  } else {
    return format(createdAt, "MMM d"); // Jun 11, etc.
  }
}

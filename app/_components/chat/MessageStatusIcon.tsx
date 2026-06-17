import React from "react";
import { Clock, CheckCheck, Check } from "lucide-react";
import type { MessageSendStatus } from "@/types/chat";

export function MessageStatusIcon({ status }: { status: MessageSendStatus }) {
  if (status === "sending") {
    return (
      <span className="inline-flex items-center opacity-60" aria-label="Sending">
        <Clock size={11} />
      </span>
    );
  }
  if (status === "read") {
    return (
      <span className="inline-flex items-center text-blue-200 dark:text-blue-300" aria-label="Read">
        <CheckCheck size={12} />
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center opacity-70" aria-label="Delivered">
        <CheckCheck size={12} />
      </span>
    );
  }
  // "sent"
  return (
    <span className="inline-flex items-center opacity-70" aria-label="Sent">
      <Check size={12} />
    </span>
  );
}

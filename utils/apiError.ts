import axios from "axios";

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    return fallback;
  }

  const message = err.response?.data?.message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (message && typeof message === "object" && "message" in message) {
    const nested = (message as { message?: unknown }).message;
    if (typeof nested === "string") {
      return nested;
    }
  }

  return fallback;
}

export function isNotVerifiedError(err: unknown): boolean {
  if (!axios.isAxiosError(err) || err.response?.status !== 403) {
    return false;
  }

  const message = err.response.data?.message;
  return (
    typeof message === "object" &&
    message !== null &&
    "code" in message &&
    (message as { code?: string }).code === "NOT_VERIFIED"
  );
}

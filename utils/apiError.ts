import axios from "axios";

const normalizeUploadError = (message: string) => {
  const lower = message.toLowerCase();

  if (
    lower.includes("unexpected end of form") ||
    lower.includes("payload too large") ||
    lower.includes("request entity too large") ||
    lower.includes("file too large") ||
    lower.includes("entity too large") ||
    lower.includes("multipart") ||
    lower.includes("form data") && lower.includes("aborted")
  ) {
    return "Maximum file size is 50MB.";
  }

  return message;
};

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    if (err instanceof Error) {
      return normalizeUploadError(err.message);
    }
    return fallback;
  }

  const data = err.response?.data;
  const rawMessage =
    typeof data === "string"
      ? data
      : data?.message;

  if (typeof rawMessage === "string") {
    return normalizeUploadError(rawMessage);
  }

  if (Array.isArray(rawMessage)) {
    return normalizeUploadError(rawMessage.join(", "));
  }

  if (rawMessage && typeof rawMessage === "object" && "message" in rawMessage) {
    const nested = (rawMessage as { message?: unknown }).message;
    if (typeof nested === "string") {
      return normalizeUploadError(nested);
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

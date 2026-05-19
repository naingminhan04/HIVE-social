import { LoginSuccessResponse } from "@/types/auth";
import { UserType } from "@/types/user";
import { normalizeUserPayload } from "@/utils/normalizeUser";
import {
  setAccessCookies,
  setRefreshCookie,
  setUserApprovalCookie,
  setVerifyCookies,
  setPendingVerifyEmail,
  setPendingAuthMethod,
  clearStaleSessionCookies,
} from "./cookies";

type AuthPayload = Record<string, unknown> | null | undefined;

export function extractAuthPayload(raw: unknown): AuthPayload {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (record.data && typeof record.data === "object") {
    return record.data as Record<string, unknown>;
  }
  return record;
}

export async function applyAuthSessionFromPayload(
  raw: unknown,
  options?: { authMethod?: "google" | "email" },
): Promise<{
  user: UserType | null;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
  configs?: LoginSuccessResponse["configs"];
}> {
  const payload = extractAuthPayload(raw);
  if (!payload) {
    return { user: null };
  }

  const accessToken =
    (payload.accessToken as string | undefined) ??
    (payload.access_token as string | undefined);
  const refreshToken =
    (payload.refreshToken as string | undefined) ??
    (payload.refresh_token as string | undefined);
  const user = normalizeUserPayload(payload.user ?? payload);
  const message =
    typeof payload.message === "string" ? payload.message : undefined;
  const configs = payload.configs as LoginSuccessResponse["configs"];

  if (user && !user.isVerified && !accessToken) {
    await clearStaleSessionCookies();
  }

  if (accessToken) {
    await setAccessCookies(accessToken);
  }
  if (refreshToken) {
    await setRefreshCookie(refreshToken);
  }

  if (user) {
    await setUserApprovalCookie(user.isVerified);

    if (!user.isVerified) {
      await setVerifyCookies();
      await setPendingVerifyEmail(user.email);
      if (options?.authMethod) {
        await setPendingAuthMethod(options.authMethod);
      }
    }
  }

  return { user, accessToken, refreshToken, message, configs };
}

export function toLoginSuccessResponse(session: Awaited<
  ReturnType<typeof applyAuthSessionFromPayload>
>): LoginSuccessResponse | null {
  if (!session.user) return null;

  return {
    message: session.message,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
    configs: session.configs,
    needsVerification: !session.user.isVerified ? true : undefined,
  };
}

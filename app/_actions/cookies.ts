"use server";

import axios from "axios";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/libs/apiBase";
import type { PendingAuthMethod } from "@/types/auth";

export async function setAccessCookies(token: string) {
  const cookie = await cookies();
  cookie.set("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function setRefreshCookie(token: string) {
  const cookie = await cookies();
  cookie.set("refresh_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function setPendingVerifyEmail(email: string) {
  const cookie = await cookies();
  cookie.set("pending_verify_email", email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function getPendingVerifyEmail() {
  const cookie = await cookies();
  return cookie.get("pending_verify_email")?.value ?? null;
}

export async function setPendingAuthMethod(method: PendingAuthMethod) {
  const cookie = await cookies();
  cookie.set("pending_auth_method", method, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getPendingAuthMethod(): Promise<PendingAuthMethod | null> {
  const cookie = await cookies();
  const value = cookie.get("pending_auth_method")?.value;
  return value === "google" || value === "email" ? value : null;
}

export async function setPendingGoogleIdToken(idToken: string) {
  const cookie = await cookies();
  cookie.set("pending_google_id_token", idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function getPendingGoogleIdToken() {
  const cookie = await cookies();
  return cookie.get("pending_google_id_token")?.value ?? null;
}

export async function clearPendingGoogleIdToken() {
  const cookie = await cookies();
  cookie.delete("pending_google_id_token");
}

export async function clearPendingAuthMethod() {
  const cookie = await cookies();
  cookie.delete("pending_auth_method");
}

export async function getVerificationStatus() {
  const cookie = await cookies();
  const approved = cookie.get("user_approved")?.value;

  return {
    pendingEmail: cookie.get("pending_verify_email")?.value ?? null,
    authMethod: await getPendingAuthMethod(),
    isApproved: approved === "approved",
    isPending: approved === "pending",
    hasVerifyState: Boolean(cookie.get("verify_state")?.value),
    hasRefreshToken: Boolean(cookie.get("refresh_token")?.value),
    hasAccessToken: Boolean(cookie.get("access_token")?.value),
    hasPendingGoogleIdToken: Boolean(cookie.get("pending_google_id_token")?.value),
  };
}

export async function clearStaleSessionCookies() {
  const cookie = await cookies();
  cookie.delete("access_token");
  cookie.delete("refresh_token");
}

type PendingUserHint = {
  googleId?: string | null;
  hasPassword?: boolean;
};

export async function ensurePendingAuthContext(user?: PendingUserHint | null) {
  const existing = await getPendingAuthMethod();
  if (existing) {
    return getVerificationStatus();
  }

  const cookie = await cookies();
  const hasPending =
    cookie.get("user_approved")?.value === "pending" ||
    Boolean(cookie.get("verify_state")?.value) ||
    Boolean(cookie.get("pending_verify_email")?.value);

  if (!hasPending) {
    return getVerificationStatus();
  }

  if (user?.googleId) {
    await setPendingAuthMethod("google");
  } else if (user?.hasPassword) {
    await setPendingAuthMethod("email");
  } else {
    await setPendingAuthMethod("google");
  }

  return getVerificationStatus();
}

export async function clearPendingVerifyEmail() {
  const cookie = await cookies();
  cookie.delete("pending_verify_email");
}

export async function clearAuthCookies() {
  const cookie = await cookies();
  cookie.delete("access_token");
  cookie.delete("refresh_token");
  cookie.delete("user_approved");
  cookie.delete("verify_state");
  cookie.delete("pending_verify_email");
  cookie.delete("pending_auth_method");
  cookie.delete("pending_google_id_token");
}

export async function clearRefreshCookie() {
  const cookie = await cookies();
  cookie.delete("refresh_token");
}

async function refreshAccessTokenFromCookie() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    });
    const payload = data?.data ?? data;
    const accessToken = payload?.accessToken ?? payload?.access_token;
    const nextRefreshToken = payload?.refreshToken ?? payload?.refresh_token;

    if (typeof accessToken !== "string" || !accessToken) {
      return null;
    }

    await setAccessCookies(accessToken);

    if (typeof nextRefreshToken === "string" && nextRefreshToken) {
      await setRefreshCookie(nextRefreshToken);
    }

    return accessToken;
  } catch {
    return null;
  }
}

export async function getToken() {
  const cookie = await cookies();
  const accessToken = cookie.get("access_token")?.value;

  return accessToken ?? (await refreshAccessTokenFromCookie());
}

export async function getRefreshToken() {
  const cookie = await cookies();
  
  return cookie.get("refresh_token")?.value;
}

export async function setVerifyCookies() {
  const cookie = await cookies();
  cookie.set("verify_state", "unverified", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearVerifyCookies() {
  const cookie = await cookies();
  cookie.delete("verify_state");
}

export async function setUserApprovalCookie(isVerified: boolean) {
  const cookie = await cookies();
  cookie.set("user_approved", isVerified ? "approved" : "pending", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  if (isVerified) {
    cookie.delete("verify_state");
    cookie.delete("pending_verify_email");
    cookie.delete("pending_auth_method");
    cookie.delete("pending_google_id_token");
  }
}

export async function clearUserApprovalCookie() {
  const cookie = await cookies();
  cookie.delete("user_approved");
}

export async function getAuthToken(): Promise<string | null> {
  const cookie = await cookies();
  return cookie.get("access_token")?.value ?? (await refreshAccessTokenFromCookie());
}

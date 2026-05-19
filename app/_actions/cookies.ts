"use server";

import { cookies } from "next/headers";

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
}

export async function clearRefreshCookie() {
  const cookie = await cookies();
  cookie.delete("refresh_token");
}

export async function getToken() {
  const cookie = await cookies();
  
  return cookie.get("access_token")?.value;
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
    maxAge: 60 * 5,
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
  }
}

export async function clearUserApprovalCookie() {
  const cookie = await cookies();
  cookie.delete("user_approved");
}

export async function getAuthToken(): Promise<string | null> {
  const cookie = await cookies();
  return cookie.get("access_token")?.value || null;
}

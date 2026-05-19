"use server";

import api from "@/libs/axios";
import { ActionResponse } from "@/types/action";
import {
  setAccessCookies,
  setRefreshCookie,
  clearVerifyCookies,
  clearPendingVerifyEmail,
  setUserApprovalCookie,
} from "./cookies";
import { VerifySuccessResponse } from "@/types/auth";
import { normalizeUserPayload } from "@/utils/normalizeUser";
import { getApiErrorMessage } from "@/utils/apiError";

export default async function verifyAction(
  email: string,
  verificationCode: string
): Promise<ActionResponse<VerifySuccessResponse>> {
  try {
    const { data } = await api.post("/auth/verify", {
      email,
      verificationCode,
    });

    const payload = data?.data ?? data;
    const accessToken = payload?.accessToken ?? payload?.access_token;
    const refreshToken = payload?.refreshToken ?? payload?.refresh_token;

    if (accessToken) {
      await setAccessCookies(accessToken);
      if (refreshToken) await setRefreshCookie(refreshToken);
    }

    const user = normalizeUserPayload(payload.user ?? payload);

    if (!user) {
      return {
        success: false,
        error: "Verification failed: No user received",
      };
    }

    const verifiedUser = accessToken ? { ...user, isVerified: true } : user;

    await setUserApprovalCookie(verifiedUser.isVerified ?? true);
    await clearVerifyCookies();
    await clearPendingVerifyEmail();

    return {
      success: true,
      data: {
        message: data.message,
        accessToken,
        refreshToken,
        user: verifiedUser,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: getApiErrorMessage(err, "Verification failed"),
    };
  }
}

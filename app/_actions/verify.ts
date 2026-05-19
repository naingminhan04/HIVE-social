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

    if (data.accessToken) {
      await setAccessCookies(data.accessToken);
      if (data.refreshToken) await setRefreshCookie(data.refreshToken);
    }

    const user = normalizeUserPayload(data.user ?? data);

    if (!user) {
      return {
        success: false,
        error: "Verification failed: No user received",
      };
    }

    await setUserApprovalCookie(user.isVerified);
    await clearVerifyCookies();
    await clearPendingVerifyEmail();

    return {
      success: true,
      data: {
        message: data.message,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: getApiErrorMessage(err, "Verification failed"),
    };
  }
}

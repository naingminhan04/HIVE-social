"use server";

import {
  setAccessCookies,
  setRefreshCookie,
  setUserApprovalCookie,
  setVerifyCookies,
  setPendingVerifyEmail,
} from "./cookies";
import api from "@/libs/axios";
import { GoogleLoginInput } from "@/types/auth";
import { ActionResponse } from "@/types/action";
import { LoginSuccessResponse } from "@/types/auth";
import { normalizeUserPayload } from "@/utils/normalizeUser";
import { getApiErrorMessage } from "@/utils/apiError";

export default async function googleLoginAction(
  input: GoogleLoginInput,
): Promise<ActionResponse<LoginSuccessResponse>> {
  try {
    const { data } = await api.post("/auth/google-login", input);
    const payload = data?.data ?? data;

    const accessToken = payload?.accessToken ?? payload?.access_token;
    const refreshToken = payload?.refreshToken ?? payload?.refresh_token;
    const user = normalizeUserPayload(payload?.user ?? payload);

    if (!user) {
      return {
        success: false,
        error: "Google login failed: No user received",
      };
    }

    if (!accessToken && !user.isVerified) {
      await setVerifyCookies();
      await setPendingVerifyEmail(user.email);
      await setUserApprovalCookie(false);

      return {
        success: true,
        data: {
          message: data.message ?? "Your email is not verified",
          user,
          configs: payload?.configs,
          needsVerification: true,
        },
      };
    }

    if (!accessToken) {
      return {
        success: false,
        error: "Google login failed: No access token received",
      };
    }

    await setAccessCookies(accessToken);
    if (refreshToken) await setRefreshCookie(refreshToken);
    await setUserApprovalCookie(user.isVerified);

    return {
      success: true,
      data: {
        message: data.message,
        accessToken,
        refreshToken,
        user,
        configs: payload?.configs,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: getApiErrorMessage(err, "Google login failed"),
    };
  }
}

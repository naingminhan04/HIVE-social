"use server";

import {
  setAccessCookies,
  setRefreshCookie,
  setUserApprovalCookie,
  setVerifyCookies,
  setPendingVerifyEmail,
} from "./cookies";
import api from "@/libs/axios";
import { LoginInput } from "@/types/auth";
import { ActionResponse } from "@/types/action";
import { LoginSuccessResponse } from "@/types/auth";
import { normalizeUserPayload } from "@/utils/normalizeUser";
import { getApiErrorMessage, isNotVerifiedError } from "@/utils/apiError";

export default async function loginAction(
  input: LoginInput,
): Promise<ActionResponse<LoginSuccessResponse>> {
  try {
    const { data } = await api.post("/auth/login", input);
    const payload = data?.data ?? data;

    const accessToken = payload?.accessToken ?? payload?.access_token;
    const refreshToken = payload?.refreshToken ?? payload?.refresh_token;
    const user = normalizeUserPayload(payload?.user ?? payload);

    if (!accessToken || !user) {
      return {
        success: false,
        error: "Login failed: No access token received",
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
    if (isNotVerifiedError(err)) {
      await setVerifyCookies();
      await setPendingVerifyEmail(input.email);
      await setUserApprovalCookie(false);

      return {
        success: false,
        error: getApiErrorMessage(err, "Your email is not verified"),
        notVerified: true,
        email: input.email,
      };
    }

    return {
      success: false,
      error: getApiErrorMessage(err, "Login failed"),
    };
  }
}

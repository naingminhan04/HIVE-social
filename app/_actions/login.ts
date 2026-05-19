"use server";

import {
  setVerifyCookies,
  setPendingVerifyEmail,
  setPendingAuthMethod,
  setUserApprovalCookie,
} from "./cookies";
import api from "@/libs/axios";
import { LoginInput } from "@/types/auth";
import { ActionResponse } from "@/types/action";
import { LoginSuccessResponse } from "@/types/auth";
import { getApiErrorMessage, isNotVerifiedError } from "@/utils/apiError";
import {
  applyAuthSessionFromPayload,
  toLoginSuccessResponse,
} from "./authSession";

export default async function loginAction(
  input: LoginInput,
): Promise<ActionResponse<LoginSuccessResponse>> {
  try {
    const { data } = await api.post("/auth/login", input);

    const session = await applyAuthSessionFromPayload(data, {
      authMethod: "email",
    });
    const response = toLoginSuccessResponse(session);

    if (!response?.accessToken || !response.user) {
      return {
        success: false,
        error: "Login failed: No access token received",
      };
    }

    return { success: true, data: response };
  } catch (err) {
    if (isNotVerifiedError(err)) {
      await setVerifyCookies();
      await setPendingVerifyEmail(input.email);
      await setPendingAuthMethod("email");
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

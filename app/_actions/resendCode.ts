"use server";

import api from "@/libs/axios";
import { ActionResponse } from "@/types/action";
import { ResendCodeSuccessResponse } from "@/types/auth";
import { getApiErrorMessage } from "@/utils/apiError";

export default async function resendCodeAction(
  email: string,
): Promise<ActionResponse<ResendCodeSuccessResponse>> {
  try {
    const { data } = await api.post(
      `/auth/resend-code/${encodeURIComponent(email)}`,
    );

    return {
      success: true,
      data: {
        message: data.message,
        verificationCodeExpiresAt: data.verificationCodeExpiresAt,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: getApiErrorMessage(err, "Could not resend verification code"),
    };
  }
}

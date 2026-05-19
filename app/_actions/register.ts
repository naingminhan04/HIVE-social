"use server";

import api from "@/libs/axios";
import { ActionResponse } from "@/types/action";
import { RegisterSuccessResponse } from "@/types/auth";
import {
  setPendingVerifyEmail,
  setUserApprovalCookie,
  setVerifyCookies,
} from "./cookies";
import { getApiErrorMessage } from "@/utils/apiError";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export default async function registerAction(
  payload: RegisterPayload,
): Promise<ActionResponse<RegisterSuccessResponse>> {
  try {
    const { data } = await api.post("/auth/register", payload);

    await setVerifyCookies();
    await setPendingVerifyEmail(payload.email.trim());
    await setUserApprovalCookie(false);

    return {
      success: true,
      data: {
        message: data.message ?? "Get verification code from admin",
      },
    };
  } catch (err) {
    return {
      success: false,
      error: getApiErrorMessage(err, "Registration failed. Please try again."),
    };
  }
}

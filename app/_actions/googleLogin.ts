"use server";

import axios from "axios";
import { GoogleLoginInput } from "@/types/auth";
import { ActionResponse } from "@/types/action";
import { LoginSuccessResponse } from "@/types/auth";
import { API_BASE_URL } from "@/libs/apiBase";
import { getApiErrorMessage } from "@/utils/apiError";
import {
  applyAuthSessionFromPayload,
  toLoginSuccessResponse,
} from "./authSession";
import { setPendingGoogleIdToken } from "./cookies";

export default async function googleLoginAction(
  input: GoogleLoginInput,
): Promise<ActionResponse<LoginSuccessResponse>> {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/google-login`, input);

    const session = await applyAuthSessionFromPayload(data, {
      authMethod: "google",
    });
    const response = toLoginSuccessResponse(session);

    if (!response) {
      return {
        success: false,
        error: "Google login failed: No user received",
      };
    }

    if (!response.user.isVerified) {
      await setPendingGoogleIdToken(input.idToken);

      return {
        success: true,
        data: {
          ...response,
          needsVerification: true,
        },
      };
    }

    if (!response.accessToken) {
      return {
        success: false,
        error: "Google login failed: No access token received",
      };
    }

    return {
      success: true,
      data: response,
    };
  } catch (err) {
    return {
      success: false,
      error: getApiErrorMessage(err, "Google login failed"),
    };
  }
}

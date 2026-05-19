"use server";

import { ActionResponse } from "@/types/action";
import { LoginSuccessResponse } from "@/types/auth";
import { getRefreshToken } from "./cookies";
import axios from "axios";
import { API_BASE_URL } from "@/libs/apiBase";
import { getApiErrorMessage } from "@/utils/apiError";
import {
  applyAuthSessionFromPayload,
  toLoginSuccessResponse,
} from "./authSession";

export async function refreshAction(): Promise<ActionResponse<LoginSuccessResponse>> {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return {
        success: false,
        error: "Session refresh failed. Please sign in again.",
      };
    }

    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    });

    const session = await applyAuthSessionFromPayload(data);
    let response = toLoginSuccessResponse(session);

    if (!response && session.accessToken) {
      const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const meSession = await applyAuthSessionFromPayload(meResponse.data);
      response = toLoginSuccessResponse({
        ...meSession,
        accessToken: meSession.accessToken ?? session.accessToken,
        refreshToken: meSession.refreshToken ?? session.refreshToken,
      });
    }

    if (!response) {
      return {
        success: false,
        error: "Session refresh failed: No user received.",
      };
    }

    return { success: true, data: response };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Session refresh failed. Please sign in again."),
    };
  }
}

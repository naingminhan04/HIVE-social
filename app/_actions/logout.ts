"use server";

import api from "@/libs/axios";
import { clearAuthCookies, getRefreshToken } from "./cookies";
import { ActionResponse } from "@/types/action";

export async function logoutAction(): Promise<ActionResponse<{ message: string }>> {
  try {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken });
    }
  } catch (error) {
    console.error("Logout API error:", error);
  }

  try {
    await clearAuthCookies();
    return { success: true, data: { message: "Logged out successfully" } };
  } catch (error) {
    console.error("Clear cookies error:", error);
    return { success: false, error: "Failed to clear session" };
  }
}

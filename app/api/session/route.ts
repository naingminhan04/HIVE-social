import { NextResponse } from "next/server";
import axios from "axios";
import {
  clearAuthCookies,
  getRefreshToken,
  setAccessCookies,
  setRefreshCookie,
  setUserApprovalCookie,
} from "@/app/_actions/cookies";
import { API_BASE_URL } from "@/libs/apiBase";
import { normalizeUserPayload } from "@/utils/normalizeUser";
import { getApiErrorMessage } from "@/utils/apiError";

const getTokenSubject = (token?: string | null) => {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as {
      sub?: unknown;
    };

    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
};

const fetchProfileUser = async (userId: string, accessToken: string) => {
  const profileResponse = await axios.get(
    `${API_BASE_URL}/users/profile/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return normalizeUserPayload(profileResponse.data.user ?? profileResponse.data);
};

const mergeSessionUser = (
  authUser: ReturnType<typeof normalizeUserPayload>,
  profileUser: ReturnType<typeof normalizeUserPayload>,
) => {
  if (!authUser) return profileUser;
  if (!profileUser) return authUser;

  return {
    ...authUser,
    ...profileUser,
    isVerified: authUser.isVerified || profileUser.isVerified,
  };
};

export async function GET() {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "No active session." },
        { status: 401 },
      );
    }

    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    });
    const payload = data?.data ?? data;

    const accessToken = (payload.accessToken ?? payload.access_token) as
      | string
      | undefined;
    const nextRefreshToken =
      ((payload.refreshToken ?? payload.refresh_token) as string | undefined) ??
      refreshToken;

    if (accessToken) {
      await setAccessCookies(accessToken);
    }

    if (payload.refreshToken ?? payload.refresh_token) {
      await setRefreshCookie(nextRefreshToken);
    }

    const userId =
      normalizeUserPayload(payload.user)?.id ??
      getTokenSubject(accessToken) ??
      getTokenSubject(nextRefreshToken);

    const authUser = normalizeUserPayload(payload.user ?? payload);
    let user = authUser;

    if (userId && accessToken) {
      try {
        const profileUser = await fetchProfileUser(userId, accessToken);
        if (profileUser) {
          user = mergeSessionUser(authUser, profileUser);
        }
      } catch {
        // Keep the refreshed auth user if the profile endpoint is temporarily unavailable.
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Could not load user profile." },
        { status: 401 },
      );
    }

    await setUserApprovalCookie(user.isVerified);

    return NextResponse.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    await clearAuthCookies();

    const message = getApiErrorMessage(
      error,
      "Session refresh failed. Please sign in again.",
    );

    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}

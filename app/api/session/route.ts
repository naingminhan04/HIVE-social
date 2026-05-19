import { NextResponse } from "next/server";
import axios from "axios";
import {
  clearAuthCookies,
  getRefreshToken,
  setAccessCookies,
  setRefreshCookie,
} from "@/app/_actions/cookies";
import { APIError } from "@/types/error";
import { UserType } from "@/types/user";

const normalizeUserPayload = (payload: unknown): UserType | null => {
  const visited = new WeakSet<object>();

  const findUser = (value: unknown, depth: number): UserType | null => {
    if (depth > 5 || !value || typeof value !== "object") {
      return null;
    }

    if (visited.has(value as object)) {
      return null;
    }

    visited.add(value as object);

    const candidate = value as Partial<UserType>;
    if (
      typeof candidate.id === "string" &&
      typeof candidate.username === "string" &&
      typeof candidate.name === "string"
    ) {
      return candidate as UserType;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findUser(item, depth + 1);
        if (nested) {
          return nested;
        }
      }

      return null;
    }

    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nested = findUser(nestedValue, depth + 1);
      if (nested) {
        return nested;
      }
    }

    return null;
  };

  return findUser(payload, 0);
};

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

export async function GET() {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      await clearAuthCookies();
      return NextResponse.json(
        { success: false, error: "No active session." },
        { status: 401 },
      );
    }

    const { data } = await axios.post(
      "https://seaapi.mine.bz/v1/api/auth/refresh-token",
      {
        refreshToken,
      },
    );

    const accessToken = data.accessToken as string | undefined;
    const nextRefreshToken = (data.refreshToken as string | undefined) ?? refreshToken;

    if (accessToken) {
      await setAccessCookies(accessToken);
    }

    if (data.refreshToken) {
      await setRefreshCookie(data.refreshToken);
    }

    let user = normalizeUserPayload(data.user);

    if (!user) {
      const userId = getTokenSubject(accessToken) ?? getTokenSubject(nextRefreshToken);

      if (userId && accessToken) {
        const profileResponse = await axios.get(
          `https://seaapi.mine.bz/v1/api/users/profile/${encodeURIComponent(userId)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        user = normalizeUserPayload(profileResponse.data);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    await clearAuthCookies();

    let message = "Session refresh failed. Please sign in again.";

    if (axios.isAxiosError(error)) {
      const payload = error.response?.data as APIError | undefined;
      message = payload?.message || payload?.error || message;
    }

    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}

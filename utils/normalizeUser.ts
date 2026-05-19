import { UserType } from "@/types/user";

const toNullableString = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const toNumber = (value: unknown) => (typeof value === "number" ? value : 0);

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "verified", "approved", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "unverified", "pending", "inactive"].includes(normalized)) {
      return false;
    }
  }
  if (value === 1) return true;
  if (value === "false" || value === 0) return false;
  return false;
};

export const normalizeUserPayload = (payload: unknown): UserType | null => {
  const visited = new WeakSet<object>();

  const findUser = (value: unknown, depth: number): UserType | null => {
    if (depth > 5 || !value || typeof value !== "object") {
      return null;
    }

    if (visited.has(value as object)) {
      return null;
    }

    visited.add(value as object);

    const candidate = value as Partial<UserType> & {
      googleId?: string | number | null;
      verified?: boolean | string | number;
      is_verified?: boolean | string | number;
      isApproved?: boolean | string | number;
      is_approved?: boolean | string | number;
      approved?: boolean | string | number;
      emailVerified?: boolean | string | number;
      email_verified?: boolean | string | number;
      status?: boolean | string | number;
      accountStatus?: boolean | string | number;
      account_status?: boolean | string | number;
    };
    const id = toNullableString(candidate.id);

    if (id) {
      const email = toNullableString(candidate.email) ?? "";
      const username = toNullableString(candidate.username) ?? id;
      const name =
        toNullableString(candidate.name) ??
        (email ? email.split("@")[0] : "SEA User");

      return {
        id,
        email,
        name,
        username,
        points: toNumber(candidate.points),
        profilePic: toNullableString(candidate.profilePic),
        isVerified: toBoolean(
          candidate.isVerified ??
            candidate.verified ??
            candidate.is_verified ??
            candidate.isApproved ??
            candidate.is_approved ??
            candidate.approved ??
            candidate.emailVerified ??
            candidate.email_verified ??
            candidate.status ??
            candidate.accountStatus ??
            candidate.account_status,
        ),
        bio: toNullableString(candidate.bio),
        createdAt: toNullableString(candidate.createdAt) ?? "",
        updatedAt: toNullableString(candidate.updatedAt) ?? "",
        hasPassword:
          typeof candidate.hasPassword === "boolean" ? candidate.hasPassword : false,
        role: candidate.role === "ADMIN" ? "ADMIN" : "USER",
        postsCount: toNumber(candidate.postsCount),
        likesCount: toNumber(candidate.likesCount),
        coverPic: toNullableString(candidate.coverPic),
        googleId:
          typeof candidate.googleId === "number"
            ? String(candidate.googleId)
            : toNullableString(candidate.googleId),
      };
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findUser(item, depth + 1);
        if (nested) return nested;
      }

      return null;
    }

    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nested = findUser(nestedValue, depth + 1);
      if (nested) return nested;
    }

    return null;
  };

  return findUser(payload, 0);
};

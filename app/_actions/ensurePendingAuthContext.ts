"use server";

import { ensurePendingAuthContext } from "./cookies";

type PendingUserHint = {
  googleId?: string | null;
  hasPassword?: boolean;
};

export async function ensurePendingAuthContextAction(user?: PendingUserHint | null) {
  return ensurePendingAuthContext(user);
}

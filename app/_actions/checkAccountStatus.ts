"use server";

import { ActionResponse } from "@/types/action";
import {
  LoginSuccessResponse,
  CheckAccountStatusInput,
  CheckAccountStatusResponse,
} from "@/types/auth";
import { UserType } from "@/types/user";
import {
  getPendingVerifyEmail,
  getPendingAuthMethod,
  getVerificationStatus,
  getPendingGoogleIdToken,
} from "./cookies";
import googleLoginAction from "./googleLogin";
import loginAction from "./login";
import { getCurrentUserAction } from "./me";

function pendingUserFromEmail(email: string, userId?: string | null): UserType {
  return {
    id: userId ?? "",
    email,
    name: "",
    username: "",
    points: 0,
    profilePic: null,
    isVerified: false,
    bio: null,
    createdAt: "",
    updatedAt: "",
    hasPassword: true,
    role: "USER",
    postsCount: 0,
    likesCount: 0,
    coverPic: null,
    googleId: null,
  };
}

function pendingRecheckHint(
  verification: Awaited<ReturnType<typeof getVerificationStatus>>,
  pendingEmail: string | null,
): CheckAccountStatusResponse {
  const authMethod = verification.authMethod;
  const useGoogle = authMethod !== "email";

  return {
    success: false,
    noSession: true,
    needsGoogleSignIn: useGoogle,
    needsPassword: !useGoogle && Boolean(pendingEmail),
    error: useGoogle
      ? "Sign in with Google again to check your approval status."
      : "Enter your password to check your approval status.",
  };
}

export async function checkAccountStatusAction(
  input?: CheckAccountStatusInput,
): Promise<CheckAccountStatusResponse> {
  if (input?.idToken) {
    return googleLoginAction({ idToken: input.idToken });
  }

  const verification = await getVerificationStatus();
  const pendingEmail = input?.email ?? verification.pendingEmail ?? (await getPendingVerifyEmail());

  const pendingGoogleIdToken = await getPendingGoogleIdToken();
  if (verification.authMethod !== "email" && pendingGoogleIdToken) {
    return googleLoginAction({ idToken: pendingGoogleIdToken });
  }

  if (pendingEmail && input?.password) {
    const loginResult = await loginAction({
      email: pendingEmail,
      password: input.password,
    });

    if (loginResult.success) {
      return loginResult;
    }

    if (loginResult.notVerified) {
      return {
        success: true,
        data: {
          user: pendingUserFromEmail(pendingEmail, input.userId),
        },
      };
    }

    return loginResult;
  }

  const hasSession = verification.hasRefreshToken || verification.hasAccessToken;
  if (hasSession) {
    const meResult = await getCurrentUserAction();
    if (meResult.success) {
      return meResult;
    }
  }

  const isPending =
    verification.isPending || verification.hasVerifyState || Boolean(pendingEmail);

  if (isPending) {
    return pendingRecheckHint(verification, pendingEmail);
  }

  const authMethod = await getPendingAuthMethod();

  return {
    success: false,
    noSession: true,
    needsGoogleSignIn: authMethod !== "email",
    needsPassword: authMethod === "email" && Boolean(pendingEmail),
    error: "No active session. Please sign in again.",
  };
}

"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState } from "react";
import { PiWarningCircle } from "react-icons/pi";
import { FcGoogle } from "react-icons/fc";
import googleLoginAction from "@/app/_actions/googleLogin";
import { useAuthStore } from "@/store/auth";
import { ActionResponse } from "@/types/action";
import { LoginSuccessResponse } from "@/types/auth";

type GoogleAuthButtonProps = {
  mode?: "sign-in" | "recheck";
  onRecheckResult?: (result: ActionResponse<LoginSuccessResponse>) => void;
};

const GoogleAuthButton = ({
  mode = "sign-in",
  onRecheckResult,
}: GoogleAuthButtonProps) => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const isRecheck = mode === "recheck";
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(0);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const label = isRecheck ? "Check status with Google" : "Sign in with Google";
  const configError = clientId
    ? ""
    : "Missing Google client ID. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.";

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setButtonWidth(nextWidth);
      }
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const mutation = useMutation({
    mutationFn: async (idToken: string) => {
      const result = await googleLoginAction({ idToken });
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      setAccessToken(data.accessToken ?? null);

      if (isRecheck) {
        onRecheckResult?.({ success: true, data });
        return;
      }

      if (data.needsVerification || !data.user.isVerified) {
        router.replace("/verify");
        return;
      }

      router.replace("/home");
    },
  });

  const errorMessage = configError || mutation.error?.message;
  const isReady = buttonWidth > 0 && Boolean(clientId);
  const isDisabled = mutation.isPending || !isReady;

  return (
    <div className="flex w-full flex-col gap-3">
      {clientId ? (
        <div
          ref={containerRef}
          className="relative h-12 w-full overflow-hidden rounded-md"
        >
          <div
            aria-hidden
            className={`flex h-full w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white p-3 text-sm font-bold text-neutral-900 transition hover:bg-neutral-100 active:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-200 dark:text-black dark:hover:bg-neutral-50 dark:active:bg-neutral-300 ${isDisabled ? "opacity-70 cursor-not-allowed" : ""
              }`}
          >
            <FcGoogle className="h-5 w-5 shrink-0" />
            <span>{label}</span>
          </div>

          {isReady && !mutation.isPending ? (
            <div
              className="absolute inset-0 z-10 cursor-pointer opacity-[0.01]"
              aria-label={label}
            >
              <GoogleLogin
                key={buttonWidth}
                theme="outline"
                size="large"
                shape="rectangular"
                text="signin_with"
                width={buttonWidth}
                onSuccess={(credentialResponse) => {
                  if (!credentialResponse.credential) return;
                  mutation.mutate(credentialResponse.credential);
                }}
                onError={() => {
                  mutation.reset();
                }}
              />
            </div>
          ) : null}

          {mutation.isPending ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-white/90 dark:bg-neutral-200/90">
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-900">
                {isRecheck ? "Checking..." : "Signing in..."}
              </span>
            </div>
          ) : null}

          {!isReady && !mutation.isPending ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-white/90 dark:bg-neutral-200/90">
              <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-700">
                Loading...
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="flex items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-500">
          <PiWarningCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};

export default GoogleAuthButton;

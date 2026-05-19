"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { PiWarningCircle } from "react-icons/pi";
import { FcGoogle } from "react-icons/fc";
import googleLoginAction from "../_actions/googleLogin";
import { useAuthStore } from "@/store/auth";

const GOOGLE_BUTTON_WIDTH = 400;

const GoogleAuthButton = () => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const configError = clientId
    ? ""
    : "Missing Google client ID. Google must return an idToken before this app can call the backend login endpoint.";

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
      router.replace(data.user.isVerified ? "/home" : "/verify");
    },
  });
  const errorMessage = configError || mutation.error?.message;

  return (
    <div className="flex w-full flex-col gap-3">
      {clientId ? (
        <div
          className={`relative h-12 w-full overflow-hidden rounded-md ${
            mutation.isPending ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <button
            type="button"
            disabled={mutation.isPending}
            className="flex h-full w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white p-3 font-bold text-neutral-900 transition hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-200 dark:text-black dark:hover:bg-neutral-50 dark:active:bg-neutral-300"
          >
            <FcGoogle className="h-5 w-5" />
            Continue with Google
          </button>
          <div className="absolute inset-0 opacity-0">
            <GoogleLogin
              theme="filled_black"
              size="large"
              shape="rectangular"
              text="continue_with"
              logo_alignment="center"
              width={GOOGLE_BUTTON_WIDTH}
              onSuccess={(credentialResponse) => {
                if (!credentialResponse.credential) return;
                mutation.mutate(credentialResponse.credential);
              }}
              onError={() => {
                mutation.reset();
              }}
            />
          </div>
        </div>
      ) : null}

      {mutation.isPending && (
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          Signing in with Google...
        </p>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-500">
          <PiWarningCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;

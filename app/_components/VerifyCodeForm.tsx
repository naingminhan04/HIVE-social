"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { PiWarningCircle } from "react-icons/pi";
import { useState } from "react";
import verifyAction from "../_actions/verify";
import resendCodeAction from "../_actions/resendCode";
import { useAuthStore } from "@/store/auth";

type Inputs = {
  verificationCode: string;
};

type VerifyCodeFormProps = {
  email: string;
};

const VerifyCodeForm = ({ email }: VerifyCodeFormProps) => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [resendMessage, setResendMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>();

  const verifyMutation = useMutation({
    mutationFn: async (data: Inputs) => {
      const result = await verifyAction(email, data.verificationCode.trim());
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      reset();
      setUser(data.user);
      router.replace("/home");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const result = await resendCodeAction(email);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      setResendMessage(data.message);
    },
    onError: () => {
      setResendMessage("");
    },
  });

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    verifyMutation.mutate(data);
  };

  const renderError = (message?: string) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-2 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-500 text-sm rounded-md px-3 py-1 mt-1">
        <PiWarningCircle className="w-4 h-4 shrink-0" />
        {message}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Enter the 6-digit code from an admin. Codes expire after 5 minutes.
      </p>

      <div className="relative">
        <input
          id="verificationCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder=" "
          className={`peer w-full border border-gray-300 dark:border-neutral-700 outline-0 p-4 rounded-md tracking-[0.35em] text-center font-mono text-lg ${
            errors.verificationCode
              ? "border-red-600"
              : "focus:border-black dark:focus:border-white"
          }`}
          {...register("verificationCode", {
            required: "Enter your verification code",
            pattern: {
              value: /^\d{6}$/,
              message: "Code must be 6 digits",
            },
          })}
        />
        <label
          htmlFor="verificationCode"
          className="absolute bg-neutral-100 dark:bg-neutral-950 px-2 left-4 top-4 text-gray-500 dark:text-gray-400 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:-top-2 peer-focus:left-2 peer-focus:text-xs peer-not-placeholder-shown:-top-2 peer-not-placeholder-shown:left-2 peer-not-placeholder-shown:text-xs"
        >
          Verification code
        </label>
        {renderError(errors.verificationCode?.message)}
      </div>

      <button
        type="submit"
        disabled={verifyMutation.isPending}
        className="p-3 font-bold bg-neutral-800 dark:bg-neutral-300 hover:bg-neutral-950 dark:hover:bg-neutral-50 text-white dark:text-black rounded-md disabled:opacity-60"
      >
        {verifyMutation.isPending ? "Verifying..." : "Verify account"}
      </button>

      {verifyMutation.isError && (
        <div className="flex items-center gap-2 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-500 text-sm rounded-md px-3 py-1">
          <PiWarningCircle className="w-4 h-4 shrink-0" />
          {verifyMutation.error.message}
        </div>
      )}

      <button
        type="button"
        onClick={() => resendMutation.mutate()}
        disabled={resendMutation.isPending}
        className="text-sm font-medium text-neutral-600 underline-offset-2 hover:underline disabled:opacity-60 dark:text-neutral-400"
      >
        {resendMutation.isPending ? "Requesting new code..." : "Resend verification code"}
      </button>

      {resendMutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-500">
          {resendMutation.error.message}
        </p>
      )}

      {resendMessage && !resendMutation.isError && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{resendMessage}</p>
      )}
    </form>
  );
};

export default VerifyCodeForm;

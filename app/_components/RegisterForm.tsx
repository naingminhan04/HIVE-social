"use client";

import GoogleAuthButton from "./GoogleAuthButton";

const Register = () => {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <GoogleAuthButton />
      <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
        New Google accounts are reviewed by an admin before they can access SEA Social.
      </p>
    </div>
  );
};

export default Register;

import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./_components/auth/LoginForm";
import { createMetadata } from "./seo";

export const metadata: Metadata = createMetadata({
  title: "Sign In",
  description:
    "Sign in to HIVE to share posts, explore profiles, manage points, chat, and follow community updates.",
  path: "/",
  noIndex: true,
});

const Home = () => {
  return (
    <main className="min-h-dvh w-dvw flex flex-col justify-center items-center p-5">
      <div className="flex flex-col items-center justify-center w-full pb-5">
        <Image
          src="/Hive.jpeg"
          alt="Hive Logo"
          width={112}
          height={112}
          priority
          className="mb-5 h-28 w-28 rounded-3xl object-cover shadow-sm"
        />
        <h1 className="text-2xl text-black dark:text-white font-bold mb-1">Welcome Back</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Sign in to join the <b>HIVE</b>
        </p>
      </div>
      <div className="mt-4 w-full flex justify-center">
        <LoginForm />
      </div>
    </main>
  );
};

export default Home;

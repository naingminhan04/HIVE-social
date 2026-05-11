import Image from "next/image";
import LoginForm from "./_components/LoginForm";
import Link from "next/link";

const Home = () => {
  return (
    <main className="min-h-dvh w-dvw flex flex-col justify-center items-center p-5">
      <div className="flex flex-col items-center justify-center w-full pb-5">
        <Image
          src="/sea-logo.jpg"
          alt="Star Education Academy Logo"
          width={100}
          height={100}
          className="rounded-full mb-5"
        />
        <h1 className="text-2xl text-black dark:text-white font-bold mb-1">Welcome Back</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Sign in to continue your social journey
        </p>
      </div>
      <div className="mt-4 w-full flex justify-center">
        <LoginForm />
      </div>
      <div className="flex justify-center items-center gap-1 mt-5">
        <p className="text-sm text-gray-600 dark:text-gray-300">Don&apos;t have an account?</p>
        <Link href="/signup" className="text-blue-600 dark:text-blue-300 text-sm">
          Sign Up
        </Link>
      </div>
    </main>
  );
};

export default Home;

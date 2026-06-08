import Image from "next/image";
import LoginForm from "./_components/auth/LoginForm";

const Home = () => {
  return (
    <main className="min-h-dvh w-dvw flex flex-col justify-center items-center p-5">
      <div className="flex flex-col items-center justify-center w-full pb-5">
        <Image
          src="/Hive.jpeg"
          alt="Hive Logo"
          width={100}
          height={100}
          className="rounded-4xl  mb-5"
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

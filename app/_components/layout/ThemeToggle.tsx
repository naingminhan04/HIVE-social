"use client";

import { useTheme } from "next-themes";
import { Sun, MoonStar, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

const positions = {
  light: "translate-x-0",
  system: "translate-x-full",
  dark: "translate-x-[200%]",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
      setMounted(true);
  }, []);


  return (
    <div className="relative flex items-center h-10 bg-white dark:bg-neutral-900 rounded-full p-1">
      {mounted && (
        <div
          className={
            `absolute top-1 left-1 w-10 h-8 rounded-full bg-blue-400 dark:bg-black shadow  transition-transform! duration-300! ease-out ${positions[theme as keyof typeof positions]}`
          }
        />
      )}

      <button disabled={!mounted} onClick={() => setTheme("light")} className="relative z-10 w-10 h-8 flex items-center justify-center">
        <Sun size={18} />
      </button>

      <button disabled={!mounted} onClick={() => setTheme("system")} className="relative z-10 w-10 h-8 flex items-center justify-center">
        <Monitor size={18} />
      </button>

      <button disabled={!mounted} onClick={() => setTheme("dark")} className="relative z-10 w-10 h-8 flex items-center justify-center">
        <MoonStar size={18} />
      </button>
    </div>
  );
}

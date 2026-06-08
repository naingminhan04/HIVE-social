import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "./_components/common/Provider";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HIVE",
  description: "Your social hive — share, connect, and buzz together",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased"
      >
        <Provider>
          {children}
        </Provider>
      </body>
    </html>
  );
}

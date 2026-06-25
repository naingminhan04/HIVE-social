import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "./_components/common/Provider";
import { Inter } from "next/font/google";
import { createMetadata, siteConfig } from "./seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  ...createMetadata({
    title: "HIVE",
    description: siteConfig.description,
  }),
  applicationName: siteConfig.name,
  generator: "Next.js",
  keywords: [
    "HIVE",
    "social hub",
    "social network",
    "posts",
    "chat",
    "leaderboard",
    "points",
  ],
  creator: "HIVE",
  publisher: "HIVE",
  icons: {
    icon: "/favicon.png",
    apple: "/Hive.jpeg",
  },
  title: {
    default: "HIVE",
    template: "%s | HIVE",
  },
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

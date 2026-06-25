import type { NextConfig } from "next";

const normalizePublicAppUrl = () => {
  const fallbackUrl = "https://hive-social.netlify.app";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  process.env.NEXT_PUBLIC_APP_URL = appUrl
    ? /^https?:\/\//i.test(appUrl)
      ? appUrl
      : `https://${appUrl}`
    : fallbackUrl;
};

normalizePublicAppUrl();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "stareducationacademy.s3.ap-southeast-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    serverActions: {
      bodySizeLimit: "999mb",
    },
  },
  reactCompiler: true,
};

export default nextConfig;

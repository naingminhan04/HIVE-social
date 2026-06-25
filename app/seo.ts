import type { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const siteUrl = appUrl
  ? (/^https?:\/\//i.test(appUrl) ? appUrl : `https://${appUrl}`).replace(/\/+$/, "")
  : "";

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const getCanonicalUrl = (path: string) => {
  if (isAbsoluteUrl(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return siteUrl ? `${siteUrl}${normalizedPath}` : normalizedPath;
};

export const siteConfig = {
  name: "HIVE",
  url: siteUrl,
  description:
    "A social hub for sharing posts, discovering people, tracking points, and staying connected with your hive.",
  image: "/Hive.jpeg",
};

type CreateMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
};

const getImageUrl = (image?: string | null) => {
  if (!image) return getCanonicalUrl(siteConfig.image);

  if (isAbsoluteUrl(image)) return image;
  if (image.startsWith("/")) return getCanonicalUrl(image);

  return getCanonicalUrl(siteConfig.image);
};

export const createMetadata = ({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noIndex = false,
}: CreateMetadataOptions): Metadata => {
  const canonical = getCanonicalUrl(path);
  const imageUrl = getImageUrl(image);
  const brandedTitle = title === siteConfig.name ? title : `${title} | ${siteConfig.name}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: brandedTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      images: [
        {
          url: imageUrl,
          alt: brandedTitle,
          width: 100,
          height: 100,
        },
      ],
      type,
    },
    twitter: {
      card: "summary",
      title: brandedTitle,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "standard",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
};

export const truncateMetadataText = (value: string, maxLength = 155) => {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
};

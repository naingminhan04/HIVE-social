import type { Metadata } from "next";

const getSiteUrl = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const fallbackUrl = "https://hive-social.netlify.app";

  if (!appUrl) return new URL(fallbackUrl);

  const normalizedUrl = /^https?:\/\//i.test(appUrl) ? appUrl : `https://${appUrl}`;

  try {
    return new URL(normalizedUrl);
  } catch {
    return new URL(fallbackUrl);
  }
};

export const siteConfig = {
  name: "HIVE",
  url: getSiteUrl(),
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
  if (!image) return siteConfig.image;

  try {
    return new URL(image).toString();
  } catch {
    return image.startsWith("/") ? image : siteConfig.image;
  }
};

export const createMetadata = ({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noIndex = false,
}: CreateMetadataOptions): Metadata => {
  const canonical = new URL(path, siteConfig.url);
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
        },
      ],
      type,
    },
    twitter: {
      card: "summary_large_image",
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
            "max-image-preview": "large",
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

import type { Metadata } from "next";
import { getUserByUsernameAction } from "@/app/_actions/user";
import { createMetadata, truncateMetadataText } from "@/app/seo";

type UserLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

const getUsername = (username: string) => {
  try {
    return decodeURIComponent(username).trim();
  } catch {
    return username.trim();
  }
};

export const generateMetadata = async ({
  params,
}: Omit<UserLayoutProps, "children">): Promise<Metadata> => {
  const { username: routeUsername } = await params;
  const username = getUsername(routeUsername);
  const result = await getUserByUsernameAction(username);

  if (!result.success) {
    return createMetadata({
      title: username ? `@${username}` : "Profile",
      description:
        "View this HIVE profile, posts, activity, points, and community presence.",
      path: `/users/${encodeURIComponent(username || routeUsername)}`,
      noIndex: true,
    });
  }

  const user = result.data;
  const displayName = user.name || `@${user.username}`;
  const description = truncateMetadataText(
    user.bio ||
      `View ${displayName}'s HIVE profile, posts, points, and community activity.`,
  );

  return createMetadata({
    title: `${displayName} (@${user.username})`,
    description,
    path: `/users/${encodeURIComponent(user.username)}`,
    image: user.profilePic,
    noIndex: true,
  });
};

const UserLayout = ({ children }: UserLayoutProps) => children;

export default UserLayout;

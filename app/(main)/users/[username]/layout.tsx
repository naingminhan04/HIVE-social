import type { Metadata } from "next";
import { getUserByUsernameAction } from "@/app/_actions/user";
import { createMetadata } from "@/app/seo";

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
  const user = result.success ? result.data : null;
  const displayName = user?.name || username;
  const profileUsername = user?.username || username;

  return createMetadata({
    title: `${displayName}'s Profile`,
    description: profileUsername
      ? `View @${profileUsername}'s HIVE profile.`
      : "View this HIVE profile.",
    path: `/users/${encodeURIComponent(profileUsername || routeUsername)}`,
  });
};

const UserLayout = ({ children }: UserLayoutProps) => children;

export default UserLayout;

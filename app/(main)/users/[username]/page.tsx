"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Profile from "@/app/_components/Profile";
import { useAuthStore } from "@/store/auth";
import { usePortalBarVisible } from "@/hooks/usePortalBarVisible";

type UserProfilePageProps = {
  params: {
    username: string;
  };
};

const UserProfilePage = ({ params }: UserProfilePageProps) => {
  const router = useRouter();
  const viewer = useAuthStore((state) => state.user);
  const isPortalBarVisible = usePortalBarVisible();
  const isOwnProfile = viewer?.username === params.username;

  useEffect(() => {
    if (isPortalBarVisible && isOwnProfile) {
      router.replace("/home");
    }
  }, [isOwnProfile, isPortalBarVisible, router]);

  if (isPortalBarVisible && isOwnProfile) {
    return null;
  }

  return (
    <div className="md:px-2">
      <Profile userId={params.username} />
    </div>
  );
};

export default UserProfilePage;

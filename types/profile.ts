import type { LucideIcon } from "lucide-react";

export type ProfileFormValues = {
  name: string;
  bio: string;
};

export type UsernameFormValues = {
  username: string;
};

export type PasswordFormValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type EditProfileTab = "photo" | "basic" | "username" | "password";

export type ProfileProps = {
  username: string;
  isPortal?: boolean;
};

export type DummyProfileProps = {
  isPortal?: boolean;
};

export type ProfileImageView = "cover" | "profile" | null;

export type ProfileEditTabItem = {
  id: EditProfileTab;
  label: string;
  icon: LucideIcon;
};

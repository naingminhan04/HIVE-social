export type UsernameUpdateResponse = {
  message: string;
  userId: string;
  username: string;
};

export type ProfilePicUpdateResponse = {
  message: string;
  profilePic: string;
};

export type CoverPicUpdateResponse = {
  message: string;
  coverPic: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export type UpdateProfilePayload = {
  name?: string;
  nickname?: string;
  bio?: string;
  phone?: string;
};

export type UpdateProfileResponse = {
  message: string;
  user: {
    id: string;
    name: string;
    username: string;
    profilePic: string | null;
    bio: unknown;
    updatedAt: string;
  };
};

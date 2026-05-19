import { UserType } from "./user";

export type LoginInput = {
  email: string;
  password: string;
};

export type GoogleLoginInput = {
  idToken: string;
};

export type PendingAuthMethod = "google" | "email";

export type ConfigsType = {
  id: string;
  freeNameChangePerMonth: number;
  freeUsernameChangePerMonth: number;
  maxBioLength: number;
  maxImagesPerPost: number;
  dailyLoginReward: number;
  profileViewReward: number;
  postLikeReward: number;
  registrationReward: number;
  nameChangeCost: number;
  usernameChangeCost: number;
  pollCreationCost: number;
  allowProfileViews: boolean;
  maintenanceMode: boolean;
  inviteOnlyRegistration: boolean;
  postCreationCost: number;
  profileViewRangeInMinutes: number;
  allowProfileViewsForAdmin: boolean;
  hotItemThreshold: number;
  chatroomParticipantsSize: number;
  createdAt: string;
  updatedAt: string;
};

export type LoginSuccessResponse = {
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user: UserType;
  configs?: ConfigsType;
  verificationCodeForTesting?: number;
  needsVerification?: boolean;
};

export type RegisterSuccessResponse = {
  message: string;
};

export type ResendCodeSuccessResponse = {
  message: string;
  verificationCodeExpiresAt: string;
};

export type VerifySuccessResponse = {
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user: UserType;
};
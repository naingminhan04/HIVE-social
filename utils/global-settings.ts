export const GlobalSettings = {
  // Core limits and counts
  freeNameChangePerMonth: 3,
  freeUsernameChangePerMonth: 2,
  maxBioLength: 160,
  maxImagesPerPost: 20,
  maxVideosPerPost: 2,
  maxVideosPerMessage: 2,
  maxVideoSizeBytes: 50 * 1024 * 1024,

  // Reward system
  dailyLoginReward: 10,
  profileViewReward: 1,
  postLikeReward: 2,
  registrationReward: 50,

  // Cost system
  nameChangeCost: 100,
  usernameChangeCost: 150,
  pollCreationCost: 50,
  postCreationCost: 3,
  chatroomCreationCost: 3,
  groupChatCreationCost: 200,
  thoughtCreationCost: 3,
  hotItemThreshold: 20,
  chatroomParticipantsSize: 6,

  // Feature flags
  allowProfileViews: true,
  maintenanceMode: false,
  inviteOnlyRegistration: false,
  profileViewRangeInMinutes: 720,

  // Permission
  allowProfileViewsForAdmin: false,

  // Notifications
  sendOnlineOfflinePushNoti: true,

  // Feed ranking
  feedPostsRankingPeriodDays: 7,
  feedNewPostPinHours: 3,
};

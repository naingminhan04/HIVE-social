export type ActionFailure = {
  success: false;
  error: string;
  notVerified?: boolean;
  email?: string;
};

export type ActionResponse<T> =
  | { success: true; data: T }
  | ActionFailure;
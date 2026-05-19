export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  message: string;
  verificationCodeForTesting: number;
};

export type RegisterFormInputs = RegisterPayload & {
  confirmPassword: string;
};

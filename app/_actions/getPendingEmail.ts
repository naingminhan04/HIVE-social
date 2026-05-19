"use server";

import { getPendingVerifyEmail } from "./cookies";

export async function getPendingEmailAction() {
  return getPendingVerifyEmail();
}

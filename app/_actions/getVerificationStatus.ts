"use server";

import { getVerificationStatus } from "./cookies";

export async function getVerificationStatusAction() {
  return getVerificationStatus();
}

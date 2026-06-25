import type { Metadata } from "next";
import { createMetadata } from "@/app/seo";

export const metadata: Metadata = createMetadata({
  title: "Account Review",
  description:
    "Check your HIVE account approval status and continue once your profile has been reviewed.",
  path: "/verify",
  noIndex: true,
});

const VerifyLayout = ({ children }: { children: React.ReactNode }) => children;

export default VerifyLayout;

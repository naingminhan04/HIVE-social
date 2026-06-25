import { Metadata } from "next";
import NavBar from "@/app/_components/layout/NavBar";
import PortalBar from "@/app/_components/layout/PortalBar";
import { createMetadata } from "@/app/seo";

export const metadata: Metadata = {
  ...createMetadata({
    title: "HIVE Social Hub",
    description:
      "Enter HIVE's polished social workspace for posts, conversations, profiles, points, and community discovery.",
    path: "/home",
    noIndex: true,
  }),
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl lg:flex mx-auto relative shadow justify-center">
      <NavBar />
      <div className="md:flex w-full">
        <div className="md:w-3/5">{children}</div>
        <PortalBar />
      </div>
    </div>
  );
}

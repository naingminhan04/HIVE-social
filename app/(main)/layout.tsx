import { Metadata } from "next";
import NavBar from "@/app/_components/layout/NavBar";
import PortalBar from "@/app/_components/layout/PortalBar";

export const metadata: Metadata = {
  title: "HIVE - Social Hub For Bees",
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

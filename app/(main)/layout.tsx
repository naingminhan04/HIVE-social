import { Metadata } from "next";
import NavBar from "../_components/NavBar";
import PortalBar from "../_components/PortalBar";

export const metadata: Metadata = {
  title: "Home - Star Education Academy",
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

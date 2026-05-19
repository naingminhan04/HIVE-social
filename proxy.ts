import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

const protectedRoutes = [
  "/home",
  "/chatroom",
  "/chat",
  "/users",
  "/posts",
  "/leaderboard",
  "/search",
];

const guestRoutes = ["/"];
const verifyRoute = ["/verify"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isGuestRoute = guestRoutes.includes(path);
  const isSignupRoute = path === "/signup";
  const isVerifyRoute = verifyRoute.includes(path);
  const cookieStore = await cookies();
  const token = cookieStore.get("refresh_token")?.value;
  const verifyState = cookieStore.get("verify_state")?.value;
  const pendingEmail = cookieStore.get("pending_verify_email")?.value;

  if (isSignupRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isProtectedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    return NextResponse.next();
  }

  if (isGuestRoute) {
    if (token) {
      const approved = cookieStore.get("user_approved")?.value;
      const hasPendingVerification = approved === "pending" && (verifyState || pendingEmail);
      const destination = hasPendingVerification ? "/verify" : "/home";
      return NextResponse.redirect(new URL(destination, req.nextUrl));
    }

    return NextResponse.next();
  }

  if (isVerifyRoute) {
    if (!token && !verifyState && !pendingEmail) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    if (token) {
      const approved = cookieStore.get("user_approved")?.value;
      if (approved === "approved") {
        return NextResponse.redirect(new URL("/home", req.nextUrl));
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

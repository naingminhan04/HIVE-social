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

function hasPendingApproval(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const approved = cookieStore.get("user_approved")?.value;
  const verifyState = cookieStore.get("verify_state")?.value;
  const pendingEmail = cookieStore.get("pending_verify_email")?.value;

  return approved === "pending" || Boolean(verifyState) || Boolean(pendingEmail);
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isGuestRoute = guestRoutes.includes(path);
  const isSignupRoute = path === "/signup";
  const isVerifyRoute = verifyRoute.includes(path);
  const cookieStore = await cookies();
  const token = cookieStore.get("refresh_token")?.value;
  const pendingApproval = hasPendingApproval(cookieStore);

  if (isSignupRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isProtectedRoute) {
    if (pendingApproval) {
      return NextResponse.redirect(new URL("/verify", req.nextUrl));
    }

    if (!token) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    return NextResponse.next();
  }

  if (isGuestRoute) {
    if (pendingApproval) {
      return NextResponse.redirect(new URL("/verify", req.nextUrl));
    }

    if (token) {
      return NextResponse.redirect(new URL("/home", req.nextUrl));
    }

    return NextResponse.next();
  }

  if (isVerifyRoute) {
    if (!pendingApproval && !token) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    const approved = cookieStore.get("user_approved")?.value;
    if (token && approved === "approved") {
      return NextResponse.redirect(new URL("/home", req.nextUrl));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

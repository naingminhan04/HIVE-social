import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export default async function proxy(req: NextRequest) {
  const protectedRoutes = ["/home", "/chatroom", "/chat", "/user", "/post"];
  const guestRoutes = ["/", "/signup"];
  const verifyRoute = ["/verify"];
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );
  const isGuestRoute = guestRoutes.includes(path);
  const isVerifyRoute = verifyRoute.includes(path);
  const token = (await cookies()).get("refresh_token")?.value;

  if (isProtectedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    return NextResponse.next();
  }
  if (isGuestRoute) {
    if (token) {
      return NextResponse.redirect(new URL("/home", req.nextUrl));
    }

    return NextResponse.next();
  }
  if (isVerifyRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    return NextResponse.next();
  }
}

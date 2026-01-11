import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開ページはそのまま通す
  const publicPaths = [
    "/login",
    "/api/auth",
    "/api/stripe",
    "/booking",
    "/api/booking",
    "/apply",
  ];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // 認証トークンの存在確認（セッションクッキー）
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // 未認証の場合はログインページにリダイレクト
  if (!sessionToken && (pathname.startsWith("/admin") || pathname.startsWith("/student"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

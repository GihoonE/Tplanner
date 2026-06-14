import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const WWW_HOST = "www.tplanner.co.kr";
const CANONICAL_HOST = "tplanner.co.kr";
const AUTH_SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

function normalizeUrl(url: URL) {
  const normalized = new URL(url);
  let changed = false;

  if (normalized.hostname === WWW_HOST) {
    normalized.hostname = CANONICAL_HOST;
    changed = true;
  }

  const callbackUrl = normalized.searchParams.get("callbackUrl");
  if (callbackUrl) {
    try {
      const normalizedCallback = new URL(callbackUrl);
      if (normalizedCallback.hostname === WWW_HOST) {
        normalizedCallback.hostname = CANONICAL_HOST;
        normalized.searchParams.set("callbackUrl", normalizedCallback.toString());
        changed = true;
      }
    } catch {
      normalized.searchParams.delete("callbackUrl");
      changed = true;
    }
  }

  return changed ? normalized : null;
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/privacy" ||
    pathname.startsWith("/docs/")
  );
}

const BODY_SIZE_LIMIT = 1024 * 1024; // 1 MB

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Body size guard — reject oversized payloads before parsing
  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > BODY_SIZE_LIMIT) {
      return NextResponse.json(
        { error: "요청 크기가 1MB를 초과합니다." },
        { status: 413 },
      );
    }
  }

  const normalizedUrl = normalizeUrl(request.nextUrl);
  if (normalizedUrl) {
    return NextResponse.redirect(normalizedUrl);
  }

  // /login 외 공개 경로는 토큰 확인 없이 통과
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: AUTH_SESSION_COOKIE,
    salt: AUTH_SESSION_COOKIE,
  });

  // 이미 로그인된 유저가 /login 접근 시 홈으로 보냄
  if (pathname === "/login") {
    if (!token) return NextResponse.next();
    const homePath = token.role === "parent" ? "/parent" : token.role === "instructor" ? "/dashboard" : "/onboarding/role";
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (!token.role && pathname !== "/onboarding/role") {
    return NextResponse.redirect(new URL("/onboarding/role", request.url));
  }

  if (token.role && pathname === "/onboarding/role") {
    const homePath = token.role === "parent" ? "/parent" : "/dashboard";
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (token.role === "parent" && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/parent", request.url));
  }

  if (token.role === "instructor" && pathname === "/parent") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/me/role|_next/static|_next/image|favicon.ico|images).*)",
  ],
};

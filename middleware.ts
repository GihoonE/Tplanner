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
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname.startsWith("/docs/")
  );
}

const BODY_SIZE_LIMIT = 1024 * 1024; // 1 MB

export async function middleware(request: NextRequest) {
  // 현재 주소 가져오기 (e.g. "/dashboard")
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

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 현재 요청의 토큰 가져오기
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: AUTH_SESSION_COOKIE,
  });

  // 토큰이 없으면 로그인 창으로 보내버림
  if (!token) {

    // param = (relative path, base url)
    const loginUrl = new URL("/login", request.url); 

    // url이 /login?callbackUrl=http://localhost:3000/dashboard 
    // 리디렉션 페이지에 추가정보를 주는거임 어디서 왔는지.
    // loginUrl.searchParams.set("callbackUrl", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    // loginUrl -> "/login?callbackUrl=http://localhost:3000/"
    return NextResponse.redirect(loginUrl);
  }

  // role 없는 로그인 유저 → 온보딩으로
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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { APP_HOST, APP_ORIGIN, MARKETING_HOSTS, MARKETING_ORIGIN, SPLIT_LIVE, isMarketingPath } from "@/lib/hosts";

const publicPaths = [
  "/welcome",
  "/pricing",
  "/help",
  "/terms",
  "/privacy",
  "/pasang",
  "/onboarding",
  "/login",
  "/signup",
  "/reset-password",
  "/verify-code",
  "/verify-email",
  "/oauth/callback",
  "/new-password",
  "/demo",
  "/api/auth",
];

const authOnlyPaths = [
  "/login",
  "/signup",
  "/reset-password",
  "/new-password",
  "/verify-code",
  "/verify-email",
];

const staticAssetPrefixes = ["/_next/", "/favicon", "/mainapp", "/narriv-logo"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthOnlyPath(pathname: string): boolean {
  return authOnlyPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isStaticAsset(pathname: string): boolean {
  return staticAssetPrefixes.some((prefix) => pathname.startsWith(prefix)) || pathname.includes(".");
}

function verifyJwt(token: string, secret: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, sigB64] = parts;
    const toSign = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto.createHmac("sha256", secret).update(toSign).digest("base64url");
    if (expectedSig !== sigB64) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as Record<string, unknown>;
    const exp = payload.exp as number | undefined;
    if (exp !== undefined && Date.now() / 1000 > exp) return false;
    return true;
  } catch {
    return false;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Website and app live on their own hosts: each sends the other's pages across, keeping the path and query.
  const host = request.headers.get("host") ?? "";
  const search = request.nextUrl.search;
  // A client-side prefetch or navigation (an RSC request) cannot follow a redirect to the other host: answer it
  // with an empty response so the router skips the prefetch, or falls back to a full page load that redirects.
  const crossHost = (url: string) => (request.headers.get("rsc") ? new NextResponse(null, { status: 204 }) : NextResponse.redirect(url));
  if (host === APP_HOST && isMarketingPath(pathname)) {
    return crossHost(`${MARKETING_ORIGIN}${pathname}${search}`);
  }
  if (SPLIT_LIVE && MARKETING_HOSTS.includes(host)) {
    if (pathname === "/") return NextResponse.rewrite(new URL("/welcome", request.url));
    if (!isMarketingPath(pathname)) return crossHost(`${APP_ORIGIN}${pathname}${search}`);
    return NextResponse.next();
  }

  // Use JWT verification like middleware.ts — more secure than boolean cookie
  const authCookie = request.cookies.get("narriv_auth");
  const authenticated = authCookie?.value ? verifyJwt(authCookie.value, JWT_SECRET) : false;

  if (isPublicPath(pathname)) {
    if (authenticated && isAuthOnlyPath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Visitors who are not signed in see the landing page at the root; signed-in users get the dashboard there.
  // On the app host the root is the product, so a visitor there signs in instead.
  if (!authenticated && pathname === "/") {
    if (host === APP_HOST) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.rewrite(new URL("/welcome", request.url));
  }

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
};

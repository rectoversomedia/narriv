import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const publicPaths = ["/login", "/signup", "/reset-password", "/verify-code", "/verify-email", "/oauth/callback", "/new-password"];
const staticAssetPrefixes = ["/_next/", "/favicon", "/mainapp", "/narriv-logo"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
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

  // Use JWT verification like middleware.ts — more secure than boolean cookie
  const authCookie = request.cookies.get("narriv_auth");
  const authenticated = authCookie?.value ? verifyJwt(authCookie.value, JWT_SECRET) : false;

  if (isPublicPath(pathname)) {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
};

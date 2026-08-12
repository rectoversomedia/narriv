import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/reset-password",
  "/new-password",
  "/verify-code",
  "/verify-email",
  "/oauth/callback",
  "/onboarding",
  "/api/auth",
  "/api/auth/",
  "/_next",
  "/favicon.ico",
  "/narriv-logo.svg",
  "/pricing",
  "/help",
];

const AUTH_PATHNAMES = ["/login", "/signup"];

// Frontend JWT secret — mirrors backend JWT_SECRET.
// Never expose this to the browser bundle; it runs only in Next.js middleware (server-side).
function verifyJwt(token: string, secret: string): { valid: boolean; expired?: boolean; payload?: Record<string, unknown> } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, sigB64] = parts;

    // Verify signature (HS256)
    const toSign = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(toSign)
      .digest("base64url");
    if (expectedSig !== sigB64) return { valid: false };

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as Record<string, unknown>;

    // Check expiry
    const exp = payload.exp as number | undefined;
    if (exp !== undefined && Date.now() / 1000 > exp) {
      return { valid: false, expired: true };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exact match for public paths
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    if (AUTH_PATHNAMES.includes(pathname)) {
      // For demo login, read JWT from httpOnly cookie set by backend
      const authCookie = request.cookies.get("narriv_auth");
      if (authCookie?.value) {
        const result = verifyJwt(authCookie.value, JWT_SECRET);
        if (result.valid) {
          return NextResponse.redirect(new URL("/", request.url));
        }
        // Invalid/expired token — clear cookie and let user through to login
        const response = NextResponse.next();
        response.cookies.delete("narriv_auth");
        return response;
      }
      // No JWT cookie — allow through to login page
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Read JWT from httpOnly cookie set by backend after login/demo
  const authCookie = request.cookies.get("narriv_auth");
  if (authCookie?.value) {
    const result = verifyJwt(authCookie.value, JWT_SECRET);
    if (result.valid) {
      return NextResponse.next();
    }
    // Invalid or expired — clear bad cookie and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("narriv_auth");
    return response;
  }

  // No JWT cookie — redirect to login with return URL
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|narriv-logo.svg).*)",
  ],
};

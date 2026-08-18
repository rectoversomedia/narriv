import { NextRequest, NextResponse } from "next/server";

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
// Use Web Crypto API (available in Edge Runtime) instead of Node.js crypto
async function verifyJwt(token: string, secret: string): Promise<{ valid: boolean; expired?: boolean; payload?: Record<string, unknown> }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, sigB64] = parts;

    // Verify signature using Web Crypto API (Edge-compatible)
    const toSign = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const signingKey = await globalThis.crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await globalThis.crypto.subtle.sign("HMAC", signingKey, encoder.encode(toSign));
    const sigBytes = new Uint8Array(signature);
    let sigBase64 = "";
    for (const byte of sigBytes) sigBase64 += String.fromCharCode(byte);
    sigBase64 = btoa(sigBase64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const expectedSig = sigBase64;
    if (expectedSig !== sigB64) return { valid: false };

    // Decode payload
    const payloadB64Url = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadB64Url)) as Record<string, unknown>;

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exact match for public paths
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    if (AUTH_PATHNAMES.includes(pathname)) {
      // For demo login, read JWT from httpOnly cookie set by backend
      const authCookie = request.cookies.get("narriv_auth");
      if (authCookie?.value) {
        const result = await verifyJwt(authCookie.value, JWT_SECRET);
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
    const result = await verifyJwt(authCookie.value, JWT_SECRET);
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

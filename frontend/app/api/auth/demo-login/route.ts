import { NextRequest, NextResponse } from "next/server";

const SCENARIOS = ["brand", "gov", "cve"];

export async function POST(
  request: NextRequest,
  _context: { params: Promise<Record<string, string>> }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://narriv-api.vercel.app";

    // The demo case the visitor picked (DemoPicker); anything else opens the brand demo.
    const requested = await request.json().catch(() => ({}));
    const scenario = SCENARIOS.includes(requested?.scenario) ? requested.scenario : "brand";
    const response = await fetch(`${backendUrl}/auth/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
      credentials: "include", // so we receive the backend's Set-Cookie (for logging/debugging)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.error || "Demo login failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Set auth cookie on FRONTEND domain so middleware can read it.
    // non-httpOnly so Edge middleware (not Node.js) can verify the JWT.
    // The cookie value is a server-generated JWT — XSS risk is same as localStorage.
    const cookieMaxAge = 30 * 60; // 30 minutes
    const isProduction = process.env.NODE_ENV === "production";
    const secureFlag = isProduction ? "; Secure" : "";
    const responseHeaders = new Headers();
    responseHeaders.set(
      "Set-Cookie",
      `narriv_auth=${data.accessToken}; Max-Age=${cookieMaxAge}; Path=/; SameSite=Lax${secureFlag}`
    );

    return NextResponse.json(
      {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      },
      { headers: responseHeaders }
    );
  } catch (err) {
    console.error("[demo-login] Proxy error:", err);
    return NextResponse.json(
      { error: "Demo login failed. Please try again." },
      { status: 500 }
    );
  }
}

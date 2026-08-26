import { NextRequest, NextResponse } from "next/server";

// Proxy OAuth token exchange to backend and set cookie on THIS domain (narriv.digital).
// The backend can't set cookies for the frontend domain due to cross-origin restrictions.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Exchange code is required." }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://narriv-api.vercel.app";
    const backendResponse = await fetch(`${backendUrl}/api/auth/oauth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.error || "OAuth exchange failed" },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();

    // Set auth cookie on FRONTEND domain so middleware can verify JWT.
    // non-httpOnly so Edge middleware (not Node.js) can read it.
    const cookieMaxAge = 7 * 24 * 60 * 60; // 7 days
    const responseHeaders = new Headers();
    responseHeaders.set(
      "Set-Cookie",
      `narriv_auth=${data.token}; Max-Age=${cookieMaxAge}; Path=/; SameSite=Lax; Secure`
    );

    return NextResponse.json(
      {
        token: data.token,
        refreshToken: data.refresh_token,
        user: data.user,
      },
      { headers: responseHeaders }
    );
  } catch (err) {
    console.error("[oauth/exchange] Proxy error:", err);
    return NextResponse.json(
      { error: "OAuth exchange failed. Please try again." },
      { status: 500 }
    );
  }
}

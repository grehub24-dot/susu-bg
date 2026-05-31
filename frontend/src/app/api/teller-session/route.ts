import { NextRequest, NextResponse } from "next/server";

const getBackendBaseUrl = () => {
  const fromServer = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
  return String(fromServer).replace(/\/+$/, "");
};

export async function GET(request: NextRequest) {
  try {
    const backendBase = getBackendBaseUrl();
    if (!backendBase) {
      return NextResponse.json(
        { success: false, message: "Backend URL is not configured" },
        { status: 500 }
      );
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/teller_session=([^;]+)/);
    const sessionId = sessionMatch ? decodeURIComponent(sessionMatch[1]) : "";

    if (!sessionId) {
      return NextResponse.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    const upstream = await fetch(
      `${backendBase}/api/teller/session`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        cache: "no-store",
      }
    );

    const text = await upstream.text();
    let jsonBody: Record<string, unknown>;
    try {
      jsonBody = JSON.parse(text);
    } catch {
      jsonBody = { success: false, message: text };
    }

    if (!upstream.ok || !(jsonBody as { success?: boolean }).success) {
      return NextResponse.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      session: (jsonBody as { session?: Record<string, unknown> }).session,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
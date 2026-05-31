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

    const sessionFromCookie = request.cookies.get("admin_session")?.value || "";
    const sessionFromQuery = request.nextUrl.searchParams.get("sessionToken") || "";
    const sessionFromHeader = request.headers.get("x-admin-session-token") || "";
    const sessionToken = sessionFromCookie || sessionFromQuery || sessionFromHeader;

    const upstream = await fetch(`${backendBase}/api/auth/admin/verify-session?sessionToken=${encodeURIComponent(sessionToken)}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "x-admin-session-token": sessionToken,
      },
    });

    const text = await upstream.text();
    let jsonBody: Record<string, unknown>;
    try {
      jsonBody = JSON.parse(text);
    } catch {
      jsonBody = { success: false, message: text };
    }

    return new NextResponse(JSON.stringify(jsonBody), {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendBase = getBackendBaseUrl();
    if (!backendBase) {
      return NextResponse.json(
        { success: false, message: "Backend URL is not configured" },
        { status: 500 }
      );
    }

    const body = await request.text();

    const sessionFromCookie = request.cookies.get("admin_session")?.value || "";
    const sessionFromHeader = request.headers.get("x-admin-session-token") || "";
    const sessionToken = sessionFromHeader || sessionFromCookie;

    const upstream = await fetch(`${backendBase}/api/auth/admin/verify-session`, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") || "application/json",
        "x-admin-session-token": sessionToken,
      },
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    let jsonBody: Record<string, unknown>;
    try {
      jsonBody = JSON.parse(text);
    } catch {
      jsonBody = { success: false, message: text };
    }

    return NextResponse.json(jsonBody, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
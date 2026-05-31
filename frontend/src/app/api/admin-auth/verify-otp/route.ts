import { NextRequest, NextResponse } from "next/server";

const getBackendBaseUrl = () => {
  const fromServer = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
  return String(fromServer).replace(/\/+$/, "");
};

function buildSetCookie(value: string, maxAge: number) {
  return `admin_session=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`;
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

    const upstream = await fetch(`${backendBase}/api/auth/admin/verify-otp`, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") || "application/json",
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

    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
    });

    if (upstream.ok) {
      const token = String(jsonBody?.sessionToken || "").trim();
      if (token) {
        headers.append("set-cookie", buildSetCookie(token, 86400));
      }
    }

    return new Response(JSON.stringify(jsonBody), {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
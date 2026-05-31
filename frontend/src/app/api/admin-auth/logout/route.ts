import { NextRequest, NextResponse } from "next/server";

const getBackendBaseUrl = () => {
  const fromServer = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
  return String(fromServer).replace(/\/+$/, "");
};

function buildClearCookie() {
  return "admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict";
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

    const upstream = await fetch(`${backendBase}/api/auth/admin/logout`, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") || "application/json",
        "x-admin-session-token": request.headers.get("x-admin-session-token") || "",
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
    headers.append("set-cookie", buildClearCookie());

    return new Response(JSON.stringify(jsonBody), {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Logout failed" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";

const getBackendBaseUrl = () => {
  const fromEnv = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!fromEnv) {
    console.error("[ADMIN-AUTH-LOGIN] Missing BACKEND_URL environment variable");
    return "";
  }
  return String(fromEnv).replace(/\/+$/, "");
};

export async function POST(request: NextRequest) {
  try {
    const backendBase = getBackendBaseUrl();
    if (!backendBase) {
      return NextResponse.json(
        { success: false, message: "Backend URL not configured. Please set BACKEND_URL in .env.local" },
        { status: 500 }
      );
    }

    const body = await request.text();

    console.log(`[ADMIN-AUTH-LOGIN] Attempting to connect to: ${backendBase}/api/auth/admin/login`);

    const upstream = await fetch(`${backendBase}/api/auth/admin/login`, {
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

    console.log(`[ADMIN-AUTH-LOGIN] Backend response status: ${upstream.status}`);
    return NextResponse.json(jsonBody, { status: upstream.status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ADMIN-AUTH-LOGIN] Error:", errorMessage);
    return NextResponse.json(
      { success: false, message: `Admin login failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

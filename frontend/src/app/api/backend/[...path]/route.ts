import { NextRequest, NextResponse } from "next/server";

/**
 * Generic backend API proxy route.
 * Routes all /api/backend/* requests through the Next.js server to the backend,
 * preventing direct browser-to-Render rate limiting issues.
 *
 * Usage from client-side:
 *   fetch("/api/backend/api/susu/groups")
 * Instead of:
 *   fetch(`${NEXT_PUBLIC_BACKEND_URL}/api/susu/groups`)
 */

const getBackendBaseUrl = () => {
  const fromServer = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
  return String(fromServer).replace(/\/+$/, "");
};

async function forward(
  request: NextRequest,
  method: "GET" | "POST" | "PATCH" | "DELETE"
) {
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    return NextResponse.json(
      { success: false, message: "Backend URL is not configured" },
      { status: 500 }
    );
  }

  // Extract the target path: /api/backend/api/susu/groups -> /api/susu/groups
  const pathParts = request.nextUrl.pathname.split("/").filter(Boolean);
  const backendIndex = pathParts.indexOf("backend");
  const targetPath =
    backendIndex >= 0 ? pathParts.slice(backendIndex + 1).join("/") : "";
  if (!targetPath) {
    return NextResponse.json(
      { success: false, message: "Missing backend target path" },
      { status: 400 }
    );
  }

  const query = request.nextUrl.search || "";
  const targetUrl = `${backendBase}/${targetPath}${query}`;

  const headers: Record<string, string> = {};
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  // Forward auth cookies/headers if present
  const authHeader = request.headers.get("authorization");
  if (authHeader) headers["authorization"] = authHeader;

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };
  if (method !== "GET") {
    init.body = await request.text();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const rawText = await upstream.text();

    // If upstream returned non-JSON (e.g. "Too Many Requests" from rate limiting),
    // wrap it in a proper JSON error response.
    let responseBody = rawText;
    const upstreamContentType = upstream.headers.get("content-type") || "";

    if (!upstreamContentType.includes("application/json") && upstream.status >= 400) {
      const wrappedMessage = upstream.status === 429
        ? "Too many requests. Please wait and try again."
        : rawText.trim() || `Backend returned status ${upstream.status}`;
      responseBody = JSON.stringify({ success: false, message: wrappedMessage });
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Backend request failed",
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}

export async function POST(request: NextRequest) {
  return forward(request, "POST");
}

export async function PATCH(request: NextRequest) {
  return forward(request, "PATCH");
}

export async function DELETE(request: NextRequest) {
  return forward(request, "DELETE");
}

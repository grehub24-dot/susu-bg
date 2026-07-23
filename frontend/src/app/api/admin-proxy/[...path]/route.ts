import { NextRequest, NextResponse } from "next/server";

const getBackendBaseUrl = () => {
  const fromServer = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
  return String(fromServer).replace(/\/+$/, "");
};

const tryDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getAdminSessionToken = async (request: NextRequest) => {
  // Next's cookie API is the most reliable source.
  const fromCookieStore = request.cookies.get("admin_session")?.value;
  if (fromCookieStore) {
    return tryDecode(fromCookieStore);
  }

  // Try to get from cookie first
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith("admin_session="));
    if (sessionCookie) {
      const value = sessionCookie.slice("admin_session=".length);
      return tryDecode(value);
    }
  }

  // Fall back to header
  const headerToken = tryDecode(request.headers.get("x-admin-session-token") || "");
  if (headerToken) {
    return headerToken;
  }

  return "";
};

async function forward(request: NextRequest, method: "GET" | "POST" | "PATCH" | "DELETE") {
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
  }

  const adminSessionToken = await getAdminSessionToken(request);
  
  if (!adminSessionToken) {
    return NextResponse.json({ success: false, message: "Admin session not found. Please login." }, { status: 401 });
  }

  const pathParts = request.nextUrl.pathname.split("/").filter(Boolean);
  const proxyIndex = pathParts.indexOf("admin-proxy");
  let targetPath = proxyIndex >= 0 ? pathParts.slice(proxyIndex + 1).join("/") : "";
  if (!targetPath) {
    return NextResponse.json({ success: false, message: "Missing admin target path" }, { status: 400 });
  }
  if (targetPath.startsWith("admin-proxy/")) {
    targetPath = targetPath.replace(/^admin-proxy\//, "");
  }
  const query = request.nextUrl.search || "";
  const targetUrl = `${backendBase}/api/admin/${targetPath}${query}`;

  const headers: Record<string, string> = {
    "x-admin-session-token": adminSessionToken
  };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store"
  };
  if (method !== "GET") {
    init.body = await request.text();
  }

  const upstream = await fetch(targetUrl, init);
  const rawText = await upstream.text();

  // If upstream returned non-JSON (e.g. "Too Many Requests" from rate limiting),
  // wrap it in a proper JSON error response so the frontend can handle it.
  let responseBody = rawText;
  let responseStatus = upstream.status;
  const contentType = upstream.headers.get("content-type") || "application/json";

  if (!contentType.includes("application/json") && upstream.status >= 400) {
    const wrappedMessage = upstream.status === 429
      ? "Too many requests. Please wait and try again."
      : rawText.trim() || `Backend returned status ${upstream.status}`;
    responseBody = JSON.stringify({ success: false, message: wrappedMessage });
  }

  return new NextResponse(responseBody, {
    status: responseStatus,
    headers: {
      "content-type": "application/json",
    },
  });
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

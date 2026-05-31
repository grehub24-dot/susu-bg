import { NextRequest, NextResponse } from "next/server";

const getBackendBaseUrl = () => {
  const fromServer = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
  return String(fromServer).replace(/\/+$/, "");
};

const getAdminSessionToken = (request: NextRequest) => {
  const fromCookieStore = request.cookies.get("admin_session")?.value;
  if (fromCookieStore) {
    try {
      return decodeURIComponent(fromCookieStore);
    } catch {
      return fromCookieStore;
    }
  }
  return "";
};

async function forward(request: NextRequest, method: "GET" | "POST") {
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
  }

  const adminSessionToken = getAdminSessionToken(request);
  if (!adminSessionToken) {
    return NextResponse.json({ success: false, message: "Admin session not found. Please login." }, { status: 401 });
  }

  const pathParts = request.nextUrl.pathname.split("/").filter(Boolean);
  const proxyIndex = pathParts.indexOf("staff-admin");
  const targetPath = proxyIndex >= 0 ? pathParts.slice(proxyIndex + 1).join("/") : "";
  if (!targetPath) {
    return NextResponse.json({ success: false, message: "Missing target path" }, { status: 400 });
  }

  const query = request.nextUrl.search || "";
  const targetUrl = `${backendBase}/api/admin/staff-management/${targetPath}${query}`;

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
  if (method === "POST") {
    init.body = await request.text();
  }

  const upstream = await fetch(targetUrl, init);
  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json"
    }
  });
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}

export async function POST(request: NextRequest) {
  return forward(request, "POST");
}
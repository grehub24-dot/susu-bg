/**
 * Safe fetch utilities that prevent "Unexpected token 'T', 'Too Many Requests' is not valid JSON"
 * errors when non-JSON error responses are returned (e.g. HTTP 429 rate limiting, infrastructure errors).
 *
 * Usage:
 *   import { safeFetchJson } from "@/lib/safe-fetch";
 *   const data = await safeFetchJson<{ success: boolean; data: MyType }>(url, init);
 *   if (!data.success) throw new Error(data.message);
 */

interface JsonableResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

/**
 * Safely fetch and parse JSON, handling non-JSON error responses gracefully.
 * Returns the parsed JSON on success, throws with a user-friendly message on failure.
 */
export async function safeFetchJson<T = Record<string, unknown>>(
  url: string | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init) as unknown as JsonableResponse;

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;

    try {
      const errorBody = await res.text();
      try {
        // Try to parse as JSON (the backend sends JSON error responses)
        const errorJson = JSON.parse(errorBody) as Record<string, unknown>;
        errorMessage = (errorJson.message || errorJson.error || errorMessage) as string;
      } catch {
        // Body is plain text (e.g. "Too Many Requests" from Render.com)
        if (errorBody && errorBody.trim()) {
          errorMessage = errorBody.trim();
        }
      }
    } catch {
      // Could not read response body at all
    }

    // Provide a user-friendly message for rate limiting
    if (res.status === 429) {
      errorMessage = "Too many requests. Please wait a moment and try again.";
    }

    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

/**
 * Safely fetch and parse JSON, returning null instead of throwing on HTTP errors.
 * Useful for optional/non-critical data loads.
 */
export async function safeFetchJsonOrNull<T = Record<string, unknown>>(
  url: string | URL,
  init?: RequestInit
): Promise<T | null> {
  try {
    return await safeFetchJson<T>(url, init);
  } catch {
    return null;
  }
}

/**
 * Safely parse a JSON response that might not be JSON.
 * Use when you already have a Response object and need to handle non-JSON error bodies.
 */
export async function safeParseJson<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;

    try {
      const errorBody = await res.text();
      try {
        const errorJson = JSON.parse(errorBody) as Record<string, unknown>;
        errorMessage = (errorJson.message || errorJson.error || errorMessage) as string;
      } catch {
        if (errorBody && errorBody.trim()) {
          errorMessage = errorBody.trim();
        }
      }
    } catch {
      // Could not read response body
    }

    if (res.status === 429) {
      errorMessage = "Too many requests. Please wait a moment and try again.";
    }

    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

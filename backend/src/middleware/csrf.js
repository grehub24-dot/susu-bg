const crypto = require("crypto");

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_COOKIE_NAME = "csrf_token";

function generateCsrfToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

function csrfMiddleware(req, res, next) {
  const isGetRequest = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";

  if (isGetRequest) {
    const csrfToken = generateCsrfToken();
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 3600000,
    });

    req.csrfToken = csrfToken;
    return next();
  }

  const cookieHeader = String(req.headers?.cookie || "");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME] || (match ? decodeURIComponent(match[1]) : undefined);
  const csrfHeader = req.headers?.[CSRF_HEADER_NAME];

  if (!csrfCookie && !csrfHeader) {
    const isApiRequest = req.path.startsWith("/api/");
    if (isApiRequest) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "CSRF token missing",
      code: "CSRF_MISSING",
    });
  }

  const providedToken = csrfHeader || csrfCookie;
  const cookieToken = csrfCookie;

  if (!crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(cookieToken || providedToken))) {
    const isApiRequest = req.path.startsWith("/api/");
    if (isApiRequest) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token",
      code: "CSRF_INVALID",
    });
  }

  next();
}

module.exports = { csrfMiddleware, generateCsrfToken, CSRF_HEADER_NAME, CSRF_COOKIE_NAME };
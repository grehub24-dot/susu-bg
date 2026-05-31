const isProduction = process.env.NODE_ENV === "production";

function createAuthCookie(name, value, maxAgeHours = 24) {
  const maxAge = maxAgeHours * 60 * 60;
  return `${name}=${value}; HttpOnly; ${isProduction ? "Secure; " : ""}SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

function clearAuthCookie(name) {
  return `${name}=; HttpOnly; ${isProduction ? "Secure; " : ""}SameSite=Strict; Path=/; Max-Age=0`;
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

module.exports = { createAuthCookie, clearAuthCookie, getCookieValue };
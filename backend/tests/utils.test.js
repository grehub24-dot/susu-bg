/**
 * Utility Tests
 */

const { createAuthCookie, clearAuthCookie, getCookieValue } = require("./src/lib/cookie");

describe("Cookie Utilities", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("createAuthCookie", () => {
    it("should create httpOnly cookie string", () => {
      const cookie = createAuthCookie("test_token", "abc123");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("test_token=abc123");
    });

    it("should include Secure flag in production", () => {
      process.env.NODE_ENV = "production";
      const cookie = createAuthCookie("test_token", "abc123");
      expect(cookie).toContain("Secure");
    });

    it("should use custom maxAge", () => {
      const cookie = createAuthCookie("test_token", "abc123", 1);
      expect(cookie).toContain("Max-Age=3600");
    });
  });

  describe("clearAuthCookie", () => {
    it("should create cookie with Max-Age=0", () => {
      const cookie = clearAuthCookie("test_token");
      expect(cookie).toContain("Max-Age=0");
    });
  });

  describe("getCookieValue", () => {
    it("should extract cookie value", () => {
      const value = getCookieValue("token=abc123; other=def", "token");
      expect(value).toBe("abc123");
    });

    it("should return null for missing cookie", () => {
      const value = getCookieValue("other=def", "token");
      expect(value).toBeNull();
    });
  });
});

describe("Request ID Middleware", () => {
  const { requestIdMiddleware, logWithRequestId } = require("./src/middleware/requestId");
  const logger = require("./src/lib/logger");

  it("should be defined", () => {
    expect(requestIdMiddleware).toBeDefined();
  });

  it("should generate request ID", () => {
    const mockReq = { headers: {}, method: "GET" };
    const mockRes = { setHeader: jest.fn(), json: jest.fn() };
    const mockNext = jest.fn();

    requestIdMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.id).toBeDefined();
    expect(mockNext).toHaveBeenCalled();
  });
});
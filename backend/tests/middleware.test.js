/**
 * Rate Limiter Tests
 */

const rateLimit = require("express-rate-limit");

describe("Rate Limiter Middleware", () => {
  it("should be defined", () => {
    expect(rateLimit).toBeDefined();
  });

  it("should accept configuration", () => {
    const limiter = rateLimit({
      windowMs: 60000,
      max: 100,
    });
    expect(limiter).toBeDefined();
  });
});

describe("Sanitization Middleware", () => {
  const { sanitizeInput } = require("./src/middleware/sanitize");

  it("should be defined", () => {
    expect(sanitizeInput).toBeDefined();
  });

  it("should handle object sanitization", () => {
    const mockReq = {
      method: "POST",
      body: { name: "<script>alert('xss')</script>" },
    };
    const mockRes = {};
    const mockNext = jest.fn();

    sanitizeInput(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("CSRF Middleware", () => {
  const { csrfMiddleware, generateCsrfToken } = require("./src/middleware/csrf");

  it("should generate token", () => {
    const token = generateCsrfToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });
});
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
  const { sanitizeInput } = require("../src/middleware/sanitize");

  it("should be defined", () => {
    expect(sanitizeInput).toBeDefined();
  });

  it("should reject dangerous content", () => {
    const mockReq = {
      method: "POST",
      body: { name: "<script>alert('xss')</script>" },
    };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockNext = jest.fn();

    sanitizeInput(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should allow safe content", () => {
    const mockReq = {
      method: "POST",
      body: { name: "John Doe", email: "john@example.com" },
    };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockNext = jest.fn();

    sanitizeInput(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

// CSRF middleware removed — API uses token-based auth, CSRF not applicable
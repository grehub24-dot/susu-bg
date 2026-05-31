/**
 * Authentication Controller Tests
 */

const request = require("supertest");
const app = require("./src/app");

describe("Authentication Endpoints", () => {
  describe("POST /api/auth/login", () => {
    it("should reject invalid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "invalid", password: "wrong" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should require all fields", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/admin/login", () => {
    it("should require admin credentials", async () => {
      const res = await request(app)
        .post("/api/auth/admin/login")
        .send({ identifier: "invalid", password: "wrong" });

      expect([400, 401]).toContain(res.status);
    });
  });
});

describe("Health Check", () => {
  it("GET /health should return ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
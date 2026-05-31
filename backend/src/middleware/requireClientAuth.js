const { verifyToken } = require("../services/token.service");

const requireClientAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Unauthorized: No access token provided" });
      return;
    }

    const token = authHeader.slice(7);

    let payload;
    try {
      payload = verifyToken(token);
    } catch (jwtError) {
      if (
        jwtError.name === "TokenExpiredError" ||
        jwtError.name === "JsonWebTokenError" ||
        jwtError.message.includes("expired") ||
        jwtError.message.includes("invalid") ||
        jwtError.message.includes("AUTH_JWT_SECRET")
      ) {
        res.status(401).json({ success: false, message: "Unauthorized: Token invalid or expired" });
        return;
      }
      throw jwtError;
    }

    if (payload.type !== "client_access" && payload.type !== "access") {
      res.status(401).json({ success: false, message: "Unauthorized: Invalid token type" });
      return;
    }

    req.clientUser = {
      id: payload.userId,
      phone: payload.phone,
      email: payload.email,
      type: payload.type
    };

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Client auth failed" });
  }
};

module.exports = requireClientAuth;
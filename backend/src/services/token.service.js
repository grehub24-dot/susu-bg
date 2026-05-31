const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";

const getSecret = () => {
  const secret = String(process.env.AUTH_JWT_SECRET || "");
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET environment variable is not set");
  }
  return secret;
};

const createAccessToken = (payload) => {
  const secret = getSecret();
  return jwt.sign(
    {
      ...payload,
      type: payload.type || "access",
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
};

const createRefreshToken = (payload) => {
  const secret = getSecret();
  return jwt.sign(
    {
      ...payload,
      type: payload.type || "refresh",
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
};

const verifyToken = (token) => {
  const secret = getSecret();
  return jwt.verify(token, secret);
};

const decodeToken = (token) => {
  return jwt.decode(token, { complete: true });
};

const getAccessTokenExpiry = (token) => {
  const secret = getSecret();
  const decoded = jwt.verify(token, secret);
  return decoded.exp ? new Date(decoded.exp * 1000) : null;
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  decodeToken,
  getAccessTokenExpiry,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL
};
const { z } = require("zod");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  if (err.name === "UnauthorizedError" || err.status === 401) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
      code: "UNAUTHORIZED"
    });
    return;
  }

  if (err.name === "ValidationError" || err.status === 400) {
    res.status(400).json({
      success: false,
      message: err.message || "Bad request",
      code: "BAD_REQUEST"
    });
    return;
  }

  if (err.status === 403) {
    res.status(403).json({
      success: false,
      message: "Forbidden",
      code: "FORBIDDEN"
    });
    return;
  }

  if (err.status === 404) {
    res.status(404).json({
      success: false,
      message: "Not found",
      code: "NOT_FOUND"
    });
    return;
  }

  const status = err.status || 500;
  const message = process.env.NODE_ENV === "production"
    ? "An unexpected error occurred"
    : err.message;

  res.status(status).json({
    success: false,
    message,
    code: "INTERNAL_ERROR",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => errorHandler(err, req, res, next));
  };
}

module.exports = { errorHandler, asyncHandler };
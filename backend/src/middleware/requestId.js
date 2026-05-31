const { v4: uuidv4 } = require("uuid");

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.setHeader("X-Request-ID", requestId);
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    res.setHeader("X-Request-ID", requestId);
    return originalSend(body);
  };

  next();
}

function logWithRequestId(logger, level, req, message, meta = {}) {
  const logData = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
    ...meta,
  };

  switch (level) {
    case "error":
      logger.error(message, logData);
      break;
    case "warn":
      logger.warn(message, logData);
      break;
    case "info":
      logger.info(message, logData);
      break;
    default:
      logger.debug(message, logData);
  }
}

module.exports = { requestIdMiddleware, logWithRequestId };
const Sentry = require("@sentry/node");
const { v4: uuidv4 } = require("uuid");

function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn("Sentry DSN not configured. Error tracking disabled.");
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version || "1.0.0",
    integrations: [
      Sentry.tracingMiddleware(),
      Sentry.requestIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error && error.status === 404) {
        return null;
      }
      return event;
    },
  });

  app.use(Sentry.Handlers.requestHandler());
  return true;
}

function captureError(error, context = {}) {
  Sentry.withScope((scope) => {
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context.endpoint) {
      scope.setTag("endpoint", context.endpoint);
    }
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}

function captureMessage(message, level = "info", context = {}) {
  Sentry.withScope((scope) => {
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    Sentry.captureMessage(message, level);
  });
}

function setTransactionName(req, name) {
  const transaction = Sentry.getCurrentHub().getScope().getTransaction();
  if (transaction) {
    transaction.setName(name || req.method + " " + req.path);
  }
}

function createTransaction(req, res, name, op) {
  const transaction = Sentry.startTransaction({
    name: name || req.method + " " + req.path,
    op: op || "http.server",
    traceId: req.headers["sentry-trace"] || uuidv4(),
  });

  req.transaction = transaction;
  res.on("finish", () => {
    transaction.setHttpStatus(res.statusCode);
    transaction.finish();
  });

  return transaction;
}

function errorHandler(err, req, res, next) {
  Sentry.captureException(err);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "An error occurred"
      : err.message,
    eventId: Sentry.lastEventId(),
  });
}

module.exports = {
  initSentry,
  captureError,
  captureMessage,
  setTransactionName,
  createTransaction,
  errorHandler,
};
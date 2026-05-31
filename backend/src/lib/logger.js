/**
 * Winston Logger Configuration
 * Enterprise-grade logging for fintech operations
 */

let winston;
try {
  // Optional dependency: allow app to run even if winston isn't installed.
  winston = require('winston');
} catch {
  winston = null;
}

const path = require('path');

if (!winston) {
  const base = {
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
    info: (...args) => console.info(...args),
    http: (...args) => console.info(...args),
    debug: (...args) => console.debug(...args)
  };

  base.financial = (action, data) => {
    base.info(`[FINANCIAL] ${action}`, {
      action,
      ...(data || {}),
      timestamp: new Date().toISOString()
    });
  };

  base.security = (event, data) => {
    base.warn(`[SECURITY] ${event}`, {
      event,
      ...(data || {}),
      timestamp: new Date().toISOString()
    });
  };

  base.api = (req, res, duration) => {
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    base[level](`${req.method} ${req.originalUrl}`, {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  };

  module.exports = base;
} else {
  // Log levels with colors
  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  };

  // Custom format for production
  const productionFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Custom format for development
  const developmentFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    })
  );

  // Determine format based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const logFormat = isProduction ? productionFormat : developmentFormat;

  // Create transports
  const transports = [
    // Console transport
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
    }),
  ];

  // Add file transports in production
  if (isProduction) {
    transports.push(
      // Error log
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Combined log
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  // Create logger instance
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format: logFormat,
    transports,
    exitOnError: false,
  });

  // Financial transaction logging helper
  logger.financial = (action, data) => {
    logger.info(`[FINANCIAL] ${action}`, {
      action,
      ...(data || {}),
      timestamp: new Date().toISOString(),
    });
  };

  // Security event logging helper
  logger.security = (event, data) => {
    logger.warn(`[SECURITY] ${event}`, {
      event,
      ...(data || {}),
      timestamp: new Date().toISOString(),
    });
  };

  // API request logging helper (Morgan-style)
  logger.api = (req, res, duration) => {
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.originalUrl}`, {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  };

  module.exports = logger;
}
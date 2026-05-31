const sanitizeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
};

const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)|(--|;|\/\*|\*\/|xp_|sp_|exec|execute)/i;

const dangerousPatterns = [
  { pattern: /<script[\s>]/gi, name: "script tag" },
  { pattern: /javascript:/gi, name: "javascript protocol" },
  { pattern: /onerror=/gi, name: "onerror event" },
  { pattern: /onclick=/gi, name: "onclick event" },
  { pattern: /onload=/gi, name: "onload event" },
  { pattern: /eval\(/gi, name: "eval function" },
  { pattern: /expression\(/gi, name: "expression function" },
];

function sanitizeInput(req, res, next) {
  if (req.method === "GET") {
    return next();
  }

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (typeof value === "string") {
          let cleanValue = value.trim();

          if (sqlInjectionPattern.test(cleanValue)) {
            throw new Error(`Potential SQL injection detected in field: ${key}`);
          }

          for (const { pattern, name } of dangerousPatterns) {
            if (pattern.test(cleanValue)) {
              throw new Error(`Potentially dangerous content detected: ${name}`);
            }
          }

          sanitized[key] = sanitizeHtml(cleanValue);
        } else if (typeof value === "object" && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  };

  if (req.body && Object.keys(req.body).length > 0) {
    try {
      req.body = sanitizeObject(req.body);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "SANITIZATION_ERROR",
      });
    }
  }

  if (req.query && Object.keys(req.query).length > 0) {
    try {
      req.query = sanitizeObject(req.query);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "SANITIZATION_ERROR",
      });
    }
  }

  next();
}

function sanitizeOutput(data) {
  if (typeof data === "string") {
    return sanitizeHtml(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeOutput(item));
  }

  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeOutput(data[key]);
      }
    }
    return sanitized;
  }

  return data;
}

module.exports = { sanitizeInput, sanitizeOutput, sanitizeHtml };
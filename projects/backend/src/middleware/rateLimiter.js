/**
 * In-Memory Rate Limiting Middleware (RFP §8 Security Hardening)
 * Protects auth and OTP endpoints against brute-force and flood attacks.
 */

export const createRateLimiter = ({
  windowMs = 60 * 1000,
  maxRequests = 10,
  message = "Too many requests, please try again later.",
} = {}) => {
  const ipRequests = new Map();

  // Periodic cleanup to avoid memory leak
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipRequests.entries()) {
      if (now > data.resetTime) {
        ipRequests.delete(ip);
      }
    }
  }, 2 * 60 * 1000);

  if (timer.unref) {
    timer.unref();
  }

  const limiter = (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === "true") {
      return next();
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    const now = Date.now();
    let clientData = ipRequests.get(ip);

    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 1,
        resetTime: now + windowMs,
      };
      ipRequests.set(ip, clientData);
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      return next();
    }

    clientData.count++;
    const remaining = Math.max(0, maxRequests - clientData.count);
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);

    if (clientData.count > maxRequests) {
      const retrySec = Math.ceil((clientData.resetTime - now) / 1000);
      res.setHeader("Retry-After", retrySec);
      return res.status(429).json({
        ok: false,
        message,
        retryAfterSeconds: retrySec,
      });
    }

    next();
  };

  // Expose store for testing and inspection
  limiter.reset = () => ipRequests.clear();
  limiter.getStore = () => ipRequests;

  return limiter;
};

// Default rate limiters
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,
  message: "Too many login/OTP attempts from this IP. Please wait 60 seconds.",
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120,
  message: "API rate limit exceeded. Please slow down your requests.",
});

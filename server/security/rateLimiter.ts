// Security Rate Limiting for Yemen Construction Platform Mobile APIs
// Comprehensive DoS protection with intelligent throttling

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';

// Enhanced rate limit configuration for different endpoint categories
export const RATE_LIMIT_CONFIG = {
  // Authentication endpoints - Stricter limits to prevent brute force
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'عدد محاولات تسجيل الدخول كثيرة. حاول مرة أخرى بعد 15 دقيقة',
      retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true, // Don't count successful auth attempts
  },

  // Sync operations - Moderate limits for data consistency
  SYNC: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 sync requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'معدل المزامنة سريع جداً. حاول مرة أخرى خلال دقيقة',
      retryAfter: '1 minute'
    }
  },

  // File upload endpoints - Limited due to resource intensity
  UPLOAD: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 uploads per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'عدد رفع الملفات كثير. حاول مرة أخرى خلال 5 دقائق',
      retryAfter: '5 minutes'
    }
  },

  // General API endpoints - Reasonable limits for normal operations
  GENERAL: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'طلبات كثيرة. حاول مرة أخرى خلال دقيقة',
      retryAfter: '1 minute'
    }
  },

  // Survey operations - Moderate limits for field work
  SURVEY: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // 50 survey operations per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'عمليات المسح كثيرة. حاول مرة أخرى خلال دقيقة',
      retryAfter: '1 minute'
    }
  }
};

/**
 * Create rate limiter with enhanced security features
 * SECURITY FIX: Remove custom keyGenerator to use built-in IPv6-safe implementation
 */
function createRateLimiter(config: any, category: string) {
  return rateLimit({
    ...config,
    // Remove custom keyGenerator - use default IPv6-safe implementation
    // The library handles IP normalization automatically
    handler: (req: Request, res: Response) => {
      const user = (req as any).user || (req as any).mobileUser;
      console.warn(`[SECURITY] Rate limit exceeded for ${category}:`, {
        userId: user?.id,
        ip: req.ip,
        endpoint: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      res.status(429).json({
        success: false,
        error: config.message.error,
        retryAfter: config.message.retryAfter,
        timestamp: new Date().toISOString()
      });
    },
    skip: (req: Request): boolean => {
      // Skip rate limiting for admin users in emergency
      const user = (req as any).user || (req as any).mobileUser;
      if (user?.role === 'admin' && req.headers['x-emergency-override'] === 'true') {
        console.log(`[SECURITY] Rate limit bypassed for admin:`, {
          userId: user.id,
          endpoint: req.path,
          timestamp: new Date().toISOString()
        });
        return true;
      }
      return false;
    }
  });
}

/**
 * Create progressive slow down middleware (delays responses for excessive requests)
 * SECURITY FIX: Remove custom keyGenerator to use built-in IPv6-safe implementation
 */
function createSlowDown(config: any) {
  return slowDown({
    windowMs: config.windowMs,
    delayAfter: Math.floor(config.max * 0.7), // Start slowing down at 70% of limit
    delayMs: (used: number, req: Request): number => {
      // Progressive delay: more requests = more delay
      const baseDelay = 500; // 500ms base delay
      const multiplier = Math.min(used, 10); // Cap at 10x multiplier
      return baseDelay * multiplier;
    }
    // Remove custom keyGenerator - use default IPv6-safe implementation
  });
}

// Export rate limiters for different endpoint categories
export const authRateLimit = createRateLimiter(RATE_LIMIT_CONFIG.AUTH, 'AUTH');
export const syncRateLimit = createRateLimiter(RATE_LIMIT_CONFIG.SYNC, 'SYNC');
export const uploadRateLimit = createRateLimiter(RATE_LIMIT_CONFIG.UPLOAD, 'UPLOAD');
export const generalRateLimit = createRateLimiter(RATE_LIMIT_CONFIG.GENERAL, 'GENERAL');
export const surveyRateLimit = createRateLimiter(RATE_LIMIT_CONFIG.SURVEY, 'SURVEY');

// Export progressive slow down middleware
export const authSlowDown = createSlowDown(RATE_LIMIT_CONFIG.AUTH);
export const syncSlowDown = createSlowDown(RATE_LIMIT_CONFIG.SYNC);
export const uploadSlowDown = createSlowDown(RATE_LIMIT_CONFIG.UPLOAD);

/**
 * Global rate limiting middleware for suspicious activity detection
 * SECURITY FIX: Remove custom keyGenerator to use built-in IPv6-safe implementation
 */
export const globalSecurityMonitor = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 total requests per minute (very high threshold)
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator - use default IPv6-safe implementation
  handler: (req: Request, res: Response) => {
    console.error(`[SECURITY ALERT] Potential DoS attack detected:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      timestamp: new Date().toISOString(),
      requestCount: '200+ per minute'
    });

    res.status(429).json({
      success: false,
      error: 'الخادم مشغول حالياً. حاول مرة أخرى لاحقاً',
      retryAfter: '1 minute',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Enhanced security logging for audit compliance
 */
export function logSecurityEvent(event: 'RATE_LIMIT_HIT' | 'DOS_ATTEMPT' | 'SUSPICIOUS_ACTIVITY', details: any) {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    details,
    severity: event === 'DOS_ATTEMPT' ? 'CRITICAL' : event === 'SUSPICIOUS_ACTIVITY' ? 'HIGH' : 'MEDIUM'
  };

  // Log to console (in production, this would go to security monitoring system)
  console.warn(`[SECURITY EVENT] ${event}:`, logEntry);

  // TODO: In production, integrate with government security logging requirements
  // - Send to central security monitoring system
  // - Store in audit trail database
  // - Alert security personnel for critical events
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 */
export function rateLimit(config: RateLimitConfig) {
  return (identifier: string): boolean => {
    const now = Date.now();
    const key = identifier;
    const limit = rateLimitStore.get(key);

    if (!limit || now > limit.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return true;
    }

    if (limit.count >= config.maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  };
}

/**
 * API rate limiter for different endpoint types
 */
export const apiRateLimiter = {
  // General API endpoints - 100 requests per minute
  general: rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }),
  
  // AI generation endpoints - 10 requests per minute (expensive operations)
  ai: rateLimit({ windowMs: 60 * 1000, maxRequests: 10 }),
  
  // Authentication endpoints - 5 requests per minute
  auth: rateLimit({ windowMs: 60 * 1000, maxRequests: 5 }),
  
  // Bot creation - 20 requests per hour (expensive operations)
  bot: rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20 })
};

/**
 * Get client IP address for rate limiting
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * Sanitize error messages for production
 */
export function sanitizeError(error: any, isDevelopment: boolean = process.env.NODE_ENV === 'development'): any {
  if (isDevelopment) {
    // In development, return full error details
    return {
      message: error.message || 'An error occurred',
      stack: error.stack,
      name: error.name,
      cause: error.cause
    };
  }

  // In production, return sanitized error
  const sanitizedMessage = getSafeErrorMessage(error);
  
  return {
    message: sanitizedMessage,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get safe error message for production
 */
function getSafeErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';
  
  const message = error.message || '';
  
  // Common safe error messages
  const safeErrors = [
    'Unauthorized',
    'Forbidden', 
    'Not found',
    'Bad request',
    'Validation failed',
    'Rate limit exceeded',
    'Service unavailable'
  ];
  
  // Check if it's a safe error message
  if (safeErrors.some(safe => message.toLowerCase().includes(safe.toLowerCase()))) {
    return message;
  }
  
  // For database errors, return generic message
  if (message.includes('database') || message.includes('sql') || message.includes('query')) {
    return 'Database operation failed';
  }
  
  // For network errors
  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return 'Network error occurred';
  }
  
  // For authentication errors
  if (message.includes('token') || message.includes('auth') || message.includes('session')) {
    return 'Authentication error';
  }
  
  // Default safe message
  return 'An error occurred while processing your request';
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize key names
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (safeKey) {
        sanitized[safeKey] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Secure API wrapper with authentication, rate limiting, and error handling
 */
export function secureAPI(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    rateLimiter?: (ip: string) => boolean;
    allowedMethods?: string[];
  } = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const method = request.method;
    const path = request.nextUrl.pathname;
    const clientIP = getClientIP(request);
    
    try {
      // Method validation
      if (options.allowedMethods && !options.allowedMethods.includes(method)) {
        logger.warn(`Method not allowed: ${method}`, 'SECURITY', { path, clientIP });
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
      }

      // Rate limiting
      if (options.rateLimiter && !options.rateLimiter(clientIP)) {
        logger.warn(`Rate limit exceeded`, 'SECURITY', { path, clientIP, method });
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Authentication check
      let session = null;
      let userId = undefined;
      
      if (options.requireAuth) {
        session = await getServerSession(authOptions);
        
        if (!session?.user?.email) {
          logger.warn(`Unauthorized access attempt`, 'SECURITY', { path, clientIP, method });
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        
        userId = session.user.email;
      }

      // Log API request
      logger.api.request(method, path, userId, { clientIP });

      // Execute handler
      const response = await handler(request, { ...context, session, userId });
      
      // Log successful response
      const duration = Date.now() - startTime;
      logger.api.response(method, path, response.status, duration, userId);
      
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const userId = options.requireAuth ? 'unknown' : undefined;
      
      // Log error
      logger.api.error(method, path, error, userId);
      
      // Return sanitized error
      const sanitizedError = sanitizeError(error);
      
      return NextResponse.json(
        { error: sanitizedError.message, timestamp: sanitizedError.timestamp },
        { status: 500 }
      );
    }
  };
}

/**
 * Validate environment variables are set
 */
export function validateEnvironment(): { isValid: boolean; missing: string[] } {
  const required = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DATABASE_URL',
    'RECALL_AI_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

/**
 * Security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Only add HSTS in production with HTTPS
  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://')) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

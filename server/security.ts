import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDatabase } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'faq_chatbot_ultra_secure_secret_hash_98765';
const db = AppDatabase.getInstance();

// Custom IP sliding-window Rate Limiter
interface LimitRecord {
  timestamps: number[];
}
const rateLimiterCache = new Map<string, LimitRecord>();
const LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 100;

export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Respect loopbacks and proxy headers
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let clientRecord = rateLimiterCache.get(ip);
  if (!clientRecord) {
    clientRecord = { timestamps: [] };
    rateLimiterCache.set(ip, clientRecord);
  }

  // Filter timestamps outside the sliding hour window
  clientRecord.timestamps = clientRecord.timestamps.filter(ts => now - ts < LIMIT_WINDOW_MS);

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - clientRecord.timestamps.length).toString());

  if (clientRecord.timestamps.length >= MAX_REQUESTS) {
    db.logAbuse(ip, `Rate limit exceeded: 100 requests/hour limit breached`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded: Limit is 100 requests per hour. Please contact support if this is an error.'
    });
    return;
  }

  clientRecord.timestamps.push(now);
  next();
}

// Input Sanitization to strip HTML / script tags / dangerous payload characters
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<\/?[^>]+(>|$)/g, '') // Strip remaining HTML tags
    .replace(/javascript:/gi, '') // Remove JS triggers
    .replace(/onclick|onsubmit|onmouseover|onload/gi, '') // Remove inline handlers
    .replace(/['"`;()]/g, (char) => {
      // Escape characters to prevent prompt injection / terminal breakouts
      switch (char) {
        case "'": return '&#39;';
        case '"': return '&quot;';
        case '`': return '&#96;';
        case ';': return '&#59;';
        case '(': return '&#40;';
        case ')': return '&#41;';
        default: return char;
      }
    })
    .trim();
}

// JWT Authentication Middleware for Protected Admin Routes
export interface AuthenticatedRequest extends Request {
  userId?: string;
  username?: string;
}

export function adminAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token. Please log in.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  } catch (err) {
    db.logAbuse(req.ip || 'unknown', 'Failed Admin authorization attempt with forged or expired JWT');
    res.status(403).json({ error: 'Forbidden', message: 'Session session has expired, please log in again.' });
  }
}

// Security Headers Middleware (acting like Flask-Talisman)
export function secureHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking via iframes (with exception for local/embedded rendering preview)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Enable browser XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Prevent Content-Type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enforce HSTS (Strict-Transport-Security) for production endpoints
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Custom Content-Security-Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: referrer; connect-src 'self' https://"
  );
  next();
}

// JWT Token Signer
export function generateToken(user: { id: string; username: string }): string {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
}

// JSON Payload Schema validator
export function validateJSONSchema(requiredKeys: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Validate Content-Type is application/json
    const contentType = req.headers['content-type'];
    if (requiredKeys.length > 0 && (!contentType || !contentType.includes('application/json'))) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Request payload must be structured in application/json format.'
      });
      return;
    }

    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    // Max 100KB to prevent DDOS buffer inflation
    if (contentLength > 102400) {
      db.logAbuse(req.ip || 'unknown', `Rejected excessive content block size of ${contentLength} bytes`);
      res.status(413).json({
        error: 'Payload Too Large',
        message: 'The submitted request payload size exceeds our 100KB limit.'
      });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Bad Request', message: 'Required JSON body structure is completely missing.' });
      return;
    }

    // Check all required keys exist
    for (const key of requiredKeys) {
      if (body[key] === undefined || body[key] === null) {
        res.status(400).json({
          error: 'Bad Request',
          message: `The required field key '${key}' is missing from the payload request.`
        });
        return;
      }
    }

    next();
  };
}

import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitizes objects to prevent NoSQL Injection attacks (OWASP A05:2025).
 * Strips any object keys starting with '$' or containing '.'
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean: any = {};
  for (const key of Object.keys(obj)) {
    // Block MongoDB query operators and dotted path injections
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
}

export const mongoSanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

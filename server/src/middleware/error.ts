import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error Handler] ${req.method} ${req.url}:`, err.message || err);

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: `A record with this ${field} already exists.`,
      },
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val: any) => val.message);
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: messages.join(', '),
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Malformed or invalid authentication token.' },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: { code: 'TOKEN_EXPIRED', message: 'Your session has expired. Please log in again.' },
    });
  }

  // Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: { code: 'INVALID_ID', message: `Invalid resource identifier format: ${err.value}` },
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = statusCode === 500 && isProd
    ? 'An internal server error occurred. Please contact system administrator.'
    : (err.message || 'An unexpected error occurred on the server.');

  res.status(statusCode).json({
    error: {
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR'),
      message,
    },
  });
};

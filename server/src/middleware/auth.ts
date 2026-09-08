import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required. Missing Bearer token.' },
      });
    }

    const token = authHeader.split(' ')[1];

    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, jwtSecret) as { id: string; role: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: { code: 'USER_NOT_FOUND', message: 'User corresponding to token no longer exists.' },
      });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or has expired.' },
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${req.user.role}' is not authorized for this resource. Required: [${roles.join(', ')}]`,
        },
      });
    }

    next();
  };
};

export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, jwtSecret) as { id: string; role: string };
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
    next();
  } catch {
    next();
  }
};

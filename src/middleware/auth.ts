import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: string | jwt.JwtPayload;
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const [, token] = bearer.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = user;
    next();
  } catch (e) {
    console.error(e);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

/**
 * Admin authorization middleware
 * Checks if user has admin role
 * Must be used after protect middleware
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No user information' });
  }

  // Check if user has admin role
  const user = req.user as any;
  
  if (user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Forbidden: Admin access required',
      error: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
};

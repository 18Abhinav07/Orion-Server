import { Request, Response, NextFunction } from 'express';

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This assumes the user object with roles is attached to the request
    // by a preceding authentication middleware (e.g., the 'protect' middleware).
    // @ts-ignore
    const userRoles = req.user?.roles as string[] | undefined;

    if (!userRoles || !userRoles.includes(role)) {
      return res.status(403).json({ message: `Forbidden: Requires '${role}' role` });
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');

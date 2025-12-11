import { Request, Response, NextFunction } from 'express';

// A simple, generic error handler.
// This should be the last middleware added to the app.
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('An error occurred:', err.stack);

  // If the error has a specific status code, use it. Otherwise, default to 500.
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred.',
    // Only include stack trace in development environment
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

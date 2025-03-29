import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session || !req.session.userId) {
    logger.warn('Unauthorized access attempt');
    return res.status(401).json({
      error: {
        message: 'Unauthorized',
        status: 401,
        timestamp: new Date().toISOString(),
      }
    });
  }
  next();
}; 
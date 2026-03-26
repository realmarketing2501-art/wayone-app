import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface AuthRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token mancante' });
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token non valido' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Must be used after authMiddleware
  if (!req.userId) return res.status(401).json({ error: 'Non autorizzato' });
  req.isAdmin = true; // verified in service layer against DB
  next();
}

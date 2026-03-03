import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken | null;
}

export function verifyFirebaseToken() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = (req.headers.authorization || '').toString();
    if (!authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const idToken = authHeader.replace('Bearer ', '');
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      req.user = decoded;
      return next();
    } catch (err) {
      console.error('[verifyFirebaseToken] token verify failed:', err);
      req.user = null;
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
  };
}

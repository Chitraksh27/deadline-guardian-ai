import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { DecodedIdToken } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-for-dev';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: typeof users.$inferSelect;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Local Bypass
  if (token === 'sandbox' || token.startsWith('sandbox_')) {
    const sandboxId = token === 'sandbox' ? 'usr-sandbox-default' : token;
    const email = `admin@example.com`;
    try {
      const result = await db.insert(users)
        .values({
          id: sandboxId,
          name: 'System Admin',
          email: email,
          image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            name: 'System Admin',
            email: email,
            updatedAt: new Date(),
          },
        })
        .returning();
      const dbUser = (result as any)[0];

      req.dbUser = dbUser;
      req.user = {
        uid: sandboxId,
        email: email,
        name: 'System Admin',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      } as any;
      
      return next();
    } catch (dbErr) {
      console.error('Error handling sandbox user upsert:', dbErr);
      return res.status(500).json({ error: 'Database error setting up sandbox user' });
    }
  }

  // 2. Custom JWT Verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.userId) {
      const result = await db.select().from(users).where(eq(users.id, decoded.userId));
      const dbUser = result[0];
      
      if (dbUser) {
        req.dbUser = dbUser;
        req.user = {
          uid: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || 'User',
          picture: dbUser.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        } as any;
        return next();
      }
    }
  } catch (err) {
    // Fall back to Firebase if JWT verification fails (e.g. it's a firebase token)
  }

  // 3. Production Firebase Admin Token Verification
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const email = decodedToken.email;
    if (!email) {
      return res.status(400).json({ error: 'Invalid token: Email missing from payload' });
    }

    // Upsert the user in PostgreSQL using raw UID
    const result = await db.insert(users)
      .values({
        id: decodedToken.uid,
        name: decodedToken.name || email.split('@')[0],
        email: email,
        image: decodedToken.picture || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: decodedToken.name || email.split('@')[0],
          email: email,
          image: decodedToken.picture || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    const dbUser = (result as any)[0];

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or sync user:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token session' });
  }
};

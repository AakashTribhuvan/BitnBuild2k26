import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../config/database';
import { signToken } from '../utils/token';
import { registerLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash, name, is_verified) VALUES ($1, $2, $3, TRUE) RETURNING id, email, name, is_verified',
      [normalizedEmail, passwordHash, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const result = await query('SELECT id, password_hash, is_admin, is_verified FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.id, isAdmin: user.is_admin });
    res.json({ token, userId: user.id, isAdmin: user.is_admin });
  } catch (error) { next(error); }
});

router.post('/google', registerLimiter, async (req, res, next) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'Google sign-in is not configured' });

  const { credential } = req.body;
  if (typeof credential !== 'string') {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  let payload;
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Invalid Google credential' });
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    return res.status(401).json({ error: 'A verified Google email is required' });
  }

  try {
    const email = payload.email.trim().toLowerCase();
    const matches = await query(
      `SELECT id, google_sub FROM users
       WHERE google_sub = $1 OR lower(email) = $2`,
      [payload.sub, email]
    );
    if (matches.rows.length > 1) {
      return res.status(409).json({ error: 'Google account matches multiple FairDrop accounts' });
    }

    let user;
    if (matches.rows.length === 1) {
      const existing = matches.rows[0];
      if (existing.google_sub && existing.google_sub !== payload.sub) {
        return res.status(409).json({ error: 'This email is linked to another Google account' });
      }
      const result = await query(
        `UPDATE users SET email = $2, google_sub = $3, is_verified = TRUE,
           name = COALESCE(name, $4)
         WHERE id = $1 RETURNING id, email, name, is_admin`,
        [existing.id, email, payload.sub, payload.name || null]
      );
      user = result.rows[0];
    } else {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      const result = await query(
        `INSERT INTO users (email, password_hash, name, is_verified, google_sub)
         VALUES ($1, $2, $3, TRUE, $4)
         RETURNING id, email, name, is_admin`,
        [email, passwordHash, payload.name || null, payload.sub]
      );
      user = result.rows[0];
    }
    const token = signToken({ userId: user.id, isAdmin: user.is_admin });
    res.json({ token, userId: user.id, isAdmin: user.is_admin });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      return res.status(409).json({ error: 'This Google account is already linked' });
    }
    next(error);
  }
});

router.post('/verify-email', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [req.user?.userId]);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, name, is_verified, is_admin FROM users WHERE id = $1', [req.user?.userId]);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

export default router;

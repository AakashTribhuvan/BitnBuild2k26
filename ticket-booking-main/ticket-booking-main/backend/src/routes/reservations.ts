import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM reservations WHERE user_id = $1 ORDER BY created_at DESC', [req.user!.userId]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM reservations WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

export default router;

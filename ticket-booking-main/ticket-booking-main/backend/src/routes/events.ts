import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM events ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

export default router;

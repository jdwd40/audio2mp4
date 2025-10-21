import { Router, Request, Response } from 'express';
import { renderRouter } from './render.js';

export const router = Router();

/**
 * Health check endpoint
 * POST /api/ping
 * Returns { ok: true }
 */
router.post('/ping', (req: Request, res: Response) => {
  res.json({ ok: true });
});

/**
 * Render routes
 */
router.use('/', renderRouter);


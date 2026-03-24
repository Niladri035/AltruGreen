import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scoreService } from '../services/scoreService';

export const scoreController = {
  async getScores(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await scoreService.getScores(req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async addScore(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({ value: z.number().int().min(1).max(45) });
      const { value } = schema.parse(req.body);
      const data = await scoreService.addScore(req.user!.id, value);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },
};

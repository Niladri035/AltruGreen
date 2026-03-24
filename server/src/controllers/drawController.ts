import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { drawService } from '../services/drawService';

export const drawController = {
  async getDraws(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await drawService.getDraws(page, limit);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getCurrentDraw(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await drawService.getCurrentDraw();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getDrawById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await drawService.getDrawById(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async simulateDraw(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({ type: z.enum(['random', 'algorithm']), month: z.string().optional() });
      const { type, month } = schema.parse(req.body);
      const data = await drawService.simulateDraw(type, month);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async executeDraw(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({ type: z.enum(['random', 'algorithm']) });
      const { type } = schema.parse(req.body);
      const data = await drawService.executeDraw(type, req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getRollover(req: Request, res: Response, next: NextFunction) {
    try {
      const amount = await drawService.getRolloverAmount();
      res.json({ success: true, data: { rolloverAmount: amount } });
    } catch (err) { next(err); }
  },
};

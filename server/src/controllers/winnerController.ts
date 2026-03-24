import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { winnerService } from '../services/winnerService';
import { VerificationStatus } from '../models/Winner';

export const winnerController = {
  async getMyWinnings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await winnerService.getMyWinnings(req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async uploadProof(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const data = await winnerService.uploadProof(req.params.id, req.user!.id, req.file);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getAllWinners(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        drawId: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
      });
      const { status, drawId, page, limit } = schema.parse(req.query);
      const data = await winnerService.getAllWinners({
        status: status as VerificationStatus | undefined,
        drawId,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async verifyWinner(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        status: z.enum(['approved', 'rejected']),
        notes: z.string().optional(),
      });
      const { status, notes } = schema.parse(req.body);
      const data = await winnerService.verifyWinner(req.params.id, req.user!.id, status as VerificationStatus, notes);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};

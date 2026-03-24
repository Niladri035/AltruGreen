import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  charityId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = signupSchema.parse(req.body);
      const result = await authService.signup(dto);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginSchema.parse(req.body);
      const result = await authService.login(dto);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const updateSchema = z.object({
        name: z.string().min(2).max(100).optional(),
        charityId: z.string().optional(),
        donationPercentage: z.number().min(10).max(100).optional(),
      });
      const updates = updateSchema.parse(req.body);
      const user = await authService.updateMe(req.user!.id, updates);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },
};

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { charityService } from '../services/charityService';

const charitySchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10).max(1000),
  logoUrl: z.string().url().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  registrationNumber: z.string().optional(),
});

export const charityController = {
  async listCharities(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await charityService.listCharities();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getCharity(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await charityService.getCharity(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async createCharity(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = charitySchema.parse(req.body);
      const data = await charityService.createCharity(dto);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  async updateCharity(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = charitySchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
      const data = await charityService.updateCharity(req.params.id, dto);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async deleteCharity(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await charityService.deleteCharity(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getCharityStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await charityService.getCharityStats();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};

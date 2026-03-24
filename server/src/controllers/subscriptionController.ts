import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { subscriptionService } from '../services/subscriptionService';

export const subscriptionController = {
  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({ plan: z.enum(['monthly', 'yearly']) });
      const { plan } = schema.parse(req.body);
      const data = await subscriptionService.createCheckoutSession(req.user!.id, plan);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async createPortal(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.createPortalSession(req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.getSubscriptionStatus(req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers['stripe-signature'] as string;
      await subscriptionService.handleWebhook(req.body as Buffer, sig);
      res.json({ received: true });
    } catch (err) { next(err); }
  },
};

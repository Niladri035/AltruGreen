import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';
import { User } from '../models/User';
import { AppError } from '../middlewares/errorHandler';

export const adminController = {
  async getAnalytics(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboardMetrics();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getRevenue(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getRevenueByMonth();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getCharityBreakdown(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getCharityBreakdown();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getDrawParticipation(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDrawParticipation();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getUserGrowth(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getUserGrowth();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const data = await analyticsService.getAdminUserList(page, limit, search);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id)
        .select('-passwordHash')
        .populate('charityId', 'name logoUrl');
      if (!user) throw new AppError('User not found', 404);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async updateUserSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { subscriptionStatus } = req.body;
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { subscriptionStatus },
        { new: true, select: '-passwordHash' }
      );
      if (!user) throw new AppError('User not found', 404);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true, select: '-passwordHash' }
      );
      if (!user) throw new AppError('User not found', 404);
      res.json({ success: true, message: 'User deactivated' });
    } catch (err) { next(err); }
  },
};

import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin access required.' });
    return;
  }
  next();
};

export const requireSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  // Import inline to avoid circular deps
  const { User } = await import('../models/User');
  const user = await User.findById(req.user.id).select('subscriptionStatus role');

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  if (user.role === 'admin') {
    next();
    return;
  }

  if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') {
    res.status(403).json({
      success: false,
      message: 'Active subscription required to access this feature.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
    return;
  }

  next();
};

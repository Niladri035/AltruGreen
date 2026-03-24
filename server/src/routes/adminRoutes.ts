import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roleGuard';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/revenue', adminController.getRevenue);
router.get('/analytics/charities', adminController.getCharityBreakdown);
router.get('/analytics/draws', adminController.getDrawParticipation);
router.get('/analytics/growth', adminController.getUserGrowth);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/subscription', adminController.updateUserSubscription);
router.delete('/users/:id', adminController.deactivateUser);

export default router;

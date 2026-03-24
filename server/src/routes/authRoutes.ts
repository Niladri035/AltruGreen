import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateMe);

export default router;

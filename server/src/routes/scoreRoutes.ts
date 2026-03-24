import { Router } from 'express';
import { scoreController } from '../controllers/scoreController';
import { authenticate } from '../middlewares/auth';
import { requireSubscription } from '../middlewares/roleGuard';

const router = Router();

router.get('/', authenticate, scoreController.getScores);
router.post('/', authenticate, requireSubscription, scoreController.addScore);

export default router;

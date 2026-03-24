import { Router } from 'express';
import { drawController } from '../controllers/drawController';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roleGuard';

const router = Router();

router.get('/', authenticate, drawController.getDraws);
router.get('/current', authenticate, drawController.getCurrentDraw);
router.get('/rollover', authenticate, requireAdmin, drawController.getRollover);
router.post('/simulate', authenticate, requireAdmin, drawController.simulateDraw);
router.post('/execute', authenticate, requireAdmin, drawController.executeDraw);
router.get('/:id', authenticate, drawController.getDrawById);

export default router;

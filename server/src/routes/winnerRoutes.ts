import { Router } from 'express';
import { winnerController } from '../controllers/winnerController';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roleGuard';
import { uploadProof } from '../utils/upload';

const router = Router();

router.get('/my', authenticate, winnerController.getMyWinnings);
router.post('/:id/proof', authenticate, uploadProof, winnerController.uploadProof);
router.get('/', authenticate, requireAdmin, winnerController.getAllWinners);
router.put('/:id/verify', authenticate, requireAdmin, winnerController.verifyWinner);

export default router;

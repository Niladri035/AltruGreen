import { Router } from 'express';
import { charityController } from '../controllers/charityController';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roleGuard';

const router = Router();

router.get('/', charityController.listCharities);
router.get('/stats', authenticate, requireAdmin, charityController.getCharityStats);
router.get('/:id', charityController.getCharity);
router.post('/', authenticate, requireAdmin, charityController.createCharity);
router.put('/:id', authenticate, requireAdmin, charityController.updateCharity);
router.delete('/:id', authenticate, requireAdmin, charityController.deleteCharity);

export default router;

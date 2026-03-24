import { Router } from 'express';
import express from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Webhook needs raw body — must be registered BEFORE json middleware globally
// We handle this in index.ts by mounting this specific route before json()
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  subscriptionController.handleWebhook
);

router.post('/checkout', authenticate, subscriptionController.createCheckout);
router.post('/portal', authenticate, subscriptionController.createPortal);
router.get('/status', authenticate, subscriptionController.getStatus);

export default router;

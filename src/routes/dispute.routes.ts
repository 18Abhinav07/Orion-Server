import { Router } from 'express';
import {
  getDisputes,
  getPendingDisputes,
  getDisputeDetails,
  createDispute,
  resolveDispute,
  addCommentToDispute,
} from '../controllers/disputeController';
import { protect } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleCheck';

const router = Router();

// All dispute routes are protected
router.use(protect);

router.post('/create', createDispute);
router.get('/:id', getDisputeDetails);

// Admin-only routes
router.get('/', requireAdmin, getDisputes);
router.get('/pending', requireAdmin, getPendingDisputes);
router.post('/:id/resolve', requireAdmin, resolveDispute);
router.post('/:id/comment', requireAdmin, addCommentToDispute);

export default router;

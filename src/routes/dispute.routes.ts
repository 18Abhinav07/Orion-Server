import { Router } from 'express';
import {
  getDisputes,
  getPendingDisputes,
  getDisputeDetails,
  createDispute,
  resolveDispute,
  addCommentToDispute,
} from '../controllers/disputeController';

const router = Router();

router.post('/create', createDispute);
router.get('/:id', getDisputeDetails);

// All routes are now public for development
router.get('/', getDisputes);
router.get('/pending', getPendingDisputes);
router.post('/:id/resolve', resolveDispute);
router.post('/:id/comment', addCommentToDispute);

export default router;

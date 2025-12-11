import { Router } from 'express';
import { checkSimilarity, getMatches, reportSimilarity } from '../controllers/similarityController';
import { protect } from '../middleware/auth';

const router = Router();

// All similarity checks should be protected
router.use(protect);

router.post('/check-similarity', checkSimilarity);
router.get('/matches/:id', getMatches);
router.post('/report', reportSimilarity);

export default router;

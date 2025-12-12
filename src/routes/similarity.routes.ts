import { Router } from 'express';
import { checkSimilarity, getMatches, reportSimilarity } from '../controllers/similarityController';

const router = Router();

router.post('/check-similarity', checkSimilarity);
router.get('/matches/:id', getMatches);
router.post('/report', reportSimilarity);

export default router;

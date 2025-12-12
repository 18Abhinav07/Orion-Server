import express from 'express';
import {
  getSimilarityStats,
  getFlaggedContent,
  updateReviewNotes,
  getContentMatches,
} from '../controllers/similarityController';

const router = express.Router();

/**
 * Admin routes for similarity engine management
 * All routes are now public for development
 */

// GET /api/admin/similarity/stats - Get similarity engine statistics
router.get('/stats', getSimilarityStats);

// GET /api/admin/similarity/flagged - Get flagged content for review
router.get('/flagged', getFlaggedContent);

// GET /api/admin/similarity/content/:contentHash - Get detailed matches for content
router.get('/content/:contentHash', getContentMatches);

// PATCH /api/admin/similarity/content/:contentHash/review - Update review notes
router.patch('/content/:contentHash/review', updateReviewNotes);

export default router;

import express from 'express';
import {
  getSimilarityStats,
  getFlaggedContent,
  updateReviewNotes,
  getContentMatches,
} from '../controllers/similarityController';
import { protect, isAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * Admin routes for similarity engine management
 * All routes require admin authentication
 */

// GET /api/admin/similarity/stats - Get similarity engine statistics
router.get('/stats', protect, isAdmin, getSimilarityStats);

// GET /api/admin/similarity/flagged - Get flagged content for review
router.get('/flagged', protect, isAdmin, getFlaggedContent);

// GET /api/admin/similarity/content/:contentHash - Get detailed matches for content
router.get('/content/:contentHash', protect, isAdmin, getContentMatches);

// PATCH /api/admin/similarity/content/:contentHash/review - Update review notes
router.patch('/content/:contentHash/review', protect, isAdmin, updateReviewNotes);

export default router;

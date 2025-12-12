import { Request, Response } from 'express';
import { getSimilarityStatistics } from '../services/similarityService';
import { Embedding } from '../models/Embedding';
import { getIndexStats } from '../services/pineconeService';
import logger from '../utils/logger';

/**
 * Get similarity engine statistics for admin dashboard
 */
export const getSimilarityStats = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching similarity statistics');

    const stats = await getSimilarityStatistics();
    const pineconeStats = await getIndexStats();

    return res.status(200).json({
      success: true,
      data: {
        embeddings: stats,
        pinecone: pineconeStats,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get similarity statistics', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve similarity statistics',
    });
  }
};

/**
 * Get flagged content for admin review
 */
export const getFlaggedContent = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status = 'blocked' } = req.query;

    logger.info('Fetching flagged content for admin review', {
      page,
      limit,
      status,
    });

    const skip = (Number(page) - 1) * Number(limit);

    const flaggedContent = await Embedding.find({
      similarityStatus: status,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-embeddingVector'); // Exclude large vector array

    const totalCount = await Embedding.countDocuments({
      similarityStatus: status,
    });

    return res.status(200).json({
      success: true,
      data: {
        content: flaggedContent,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to get flagged content', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve flagged content',
    });
  }
};

/**
 * Update review notes for flagged content
 */
export const updateReviewNotes = async (req: Request, res: Response) => {
  try {
    const { contentHash } = req.params;
    const { reviewNotes, similarityStatus } = req.body;

    logger.info('Updating review notes', {
      contentHash,
      reviewNotes,
      similarityStatus,
    });

    if (!reviewNotes && !similarityStatus) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Either reviewNotes or similarityStatus must be provided',
      });
    }

    const embedding = await Embedding.findOne({ contentHash });

    if (!embedding) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Embedding not found for content hash',
      });
    }

    if (reviewNotes) {
      embedding.reviewNotes = reviewNotes;
    }

    if (similarityStatus) {
      if (!['clean', 'warning', 'blocked', 'pending-review'].includes(similarityStatus)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: 'Invalid similarityStatus value',
        });
      }
      embedding.similarityStatus = similarityStatus;
    }

    await embedding.save();

    logger.info('Successfully updated review notes', {
      contentHash,
      newStatus: embedding.similarityStatus,
    });

    return res.status(200).json({
      success: true,
      message: 'Review notes updated successfully',
      data: {
        contentHash: embedding.contentHash,
        similarityStatus: embedding.similarityStatus,
        reviewNotes: embedding.reviewNotes,
      },
    });
  } catch (error: any) {
    logger.error('Failed to update review notes', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to update review notes',
    });
  }
};

/**
 * Get detailed similarity matches for a specific content hash
 */
export const getContentMatches = async (req: Request, res: Response) => {
  try {
    const { contentHash } = req.params;

    logger.info('Fetching similarity matches for content', { contentHash });

    const embedding = await Embedding.findOne({ contentHash }).select('-embeddingVector');

    if (!embedding) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Content not found',
      });
    }

    // Get top match details if available
    let topMatchDetails = null;
    if (embedding.topMatchContentHash) {
      topMatchDetails = await Embedding.findOne({
        contentHash: embedding.topMatchContentHash,
      }).select('-embeddingVector');
    }

    return res.status(200).json({
      success: true,
      data: {
        content: embedding,
        topMatch: topMatchDetails,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get content matches', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve content matches',
    });
  }
};

// Legacy placeholder functions (keeping for backwards compatibility)
export const checkSimilarity = async (req: Request, res: Response) => {
  logger.debug(`checkSimilarity called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented - Use /generate-mint-token endpoint instead' });
};

export const getMatches = getContentMatches; // Alias to new function

export const reportSimilarity = async (req: Request, res: Response) => {
  logger.debug(`reportSimilarity called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

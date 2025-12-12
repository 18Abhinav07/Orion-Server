import { Request, Response } from 'express';
import { LicenseTermsCache } from '../models/LicenseTermsCache';
import logger from '../utils/logger';

/**
 * Find cached license terms
 * GET /api/license-terms/find?type=commercial_remix&royalty=12
 */
export const findLicenseTerms = async (req: Request, res: Response) => {
  try {
    const { type, royalty } = req.query;

    logger.info('Finding license terms', { type, royalty });

    // Validation
    if (!type || royalty === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: type, royalty',
      });
    }

    const royaltyNum = parseInt(royalty as string);
    if (isNaN(royaltyNum) || royaltyNum < 0 || royaltyNum > 100) {
      return res.status(422).json({
        success: false,
        error: 'Invalid royalty percent. Must be between 0 and 100',
        received: royalty,
      });
    }

    if (!['commercial_remix', 'non_commercial'].includes(type as string)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid license type. Must be commercial_remix or non_commercial',
        received: type,
      });
    }

    // Check cache
    const cached = await LicenseTermsCache.findOne({
      licenseType: type as string,
      royaltyPercent: royaltyNum,
    });

    if (cached) {
      logger.info('License terms found in cache', {
        licenseTermsId: cached.licenseTermsId,
        licenseType: cached.licenseType,
        royaltyPercent: cached.royaltyPercent,
      });

      return res.json({
        success: true,
        licenseTermsId: cached.licenseTermsId,
        cached: true,
        licenseType: cached.licenseType,
        royaltyPercent: cached.royaltyPercent,
      });
    } else {
      logger.info('License terms not found in cache', { type, royalty });

      return res.json({
        success: true,
        licenseTermsId: null,
        cached: false,
        message: 'License terms not cached, registration required',
      });
    }
  } catch (error: any) {
    logger.error('Error finding license terms', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Cache license terms
 * POST /api/license-terms/cache
 */
export const cacheLicenseTerms = async (req: Request, res: Response) => {
  try {
    const { licenseType, royaltyPercent, licenseTermsId, transactionHash } = req.body;

    logger.info('Caching license terms', {
      licenseType,
      royaltyPercent,
      licenseTermsId,
    });

    // Validation
    if (!licenseType || royaltyPercent === undefined || !licenseTermsId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: licenseType, royaltyPercent, licenseTermsId',
        received: { licenseType, royaltyPercent, licenseTermsId },
      });
    }

    if (!['commercial_remix', 'non_commercial'].includes(licenseType)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid license type',
        received: licenseType,
      });
    }

    if (typeof royaltyPercent !== 'number' || royaltyPercent < 0 || royaltyPercent > 100) {
      return res.status(422).json({
        success: false,
        error: 'Invalid royalty percent. Must be between 0 and 100',
        received: royaltyPercent,
      });
    }

    // Find existing or create new
    let cached = await LicenseTermsCache.findOne({
      licenseType,
      royaltyPercent,
    });

    let wasInserted = false;

    if (cached) {
      // Update existing
      cached.licenseTermsId = licenseTermsId;
      if (transactionHash) {
        cached.transactionHash = transactionHash;
      }
      await cached.save();
    } else {
      // Create new
      cached = new LicenseTermsCache({
        licenseType,
        royaltyPercent,
        licenseTermsId,
        transactionHash,
      });
      await cached.save();
      wasInserted = true;
    }

    logger.info('License terms cached successfully', {
      licenseTermsId,
      wasInserted,
    });

    return res.status(wasInserted ? 201 : 200).json({
      success: true,
      message: wasInserted
        ? 'License terms cached successfully'
        : 'License terms already cached',
      data: {
        licenseType: cached.licenseType,
        royaltyPercent: cached.royaltyPercent,
        licenseTermsId: cached.licenseTermsId,
        createdAt: cached.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Error caching license terms', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

import { Request, Response } from 'express';
import MintToken from '../models/MintToken';
import logger from '../utils/logger';

/**
 * Get registered IPs with filtering and pagination
 * 
 * Query parameters:
 * - status: Filter by token status (registered, used)
 * - commercialUse: Filter by commercial use flag (true/false)
 * - maxRoyalty: Maximum royalty percentage (0-100)
 * - minRoyalty: Minimum royalty percentage (0-100)
 * - licenseType: Filter by license type (commercial_remix, non_commercial)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
export const getMarketplaceIPs = async (req: Request, res: Response) => {
  logger.info(`getMarketplaceIPs request with query: ${JSON.stringify(req.query)}`);
  
  try {
    const {
      status,
      commercialUse,
      maxRoyalty,
      minRoyalty,
      licenseType,
      page = '1',
      limit = '20'
    } = req.query;

    // Build query filter
    const filter: any = {};

    // Filter by status (only show registered or used IPs)
    if (status) {
      const validStatuses = ['registered', 'used'];
      if (!validStatuses.includes(status as string)) {
        logger.warn(`Invalid status filter: ${status}`);
        return res.status(422).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      filter.status = status;
    } else {
      // Default: only show registered IPs (finalized with license)
      filter.status = 'registered';
    }

    // Filter by commercial use
    if (commercialUse !== undefined) {
      if (commercialUse !== 'true' && commercialUse !== 'false') {
        logger.warn(`Invalid commercialUse filter: ${commercialUse}`);
        return res.status(422).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'commercialUse must be true or false'
        });
      }
      filter.commercialUse = commercialUse === 'true';
    }

    // Filter by royalty percentage range
    if (maxRoyalty !== undefined || minRoyalty !== undefined) {
      filter.royaltyPercent = {};

      if (maxRoyalty !== undefined) {
        const maxRoyaltyNum = parseFloat(maxRoyalty as string);
        if (isNaN(maxRoyaltyNum) || maxRoyaltyNum < 0 || maxRoyaltyNum > 100) {
          logger.warn(`Invalid maxRoyalty: ${maxRoyalty}`);
          return res.status(422).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'maxRoyalty must be a number between 0 and 100'
          });
        }
        filter.royaltyPercent.$lte = maxRoyaltyNum;
      }

      if (minRoyalty !== undefined) {
        const minRoyaltyNum = parseFloat(minRoyalty as string);
        if (isNaN(minRoyaltyNum) || minRoyaltyNum < 0 || minRoyaltyNum > 100) {
          logger.warn(`Invalid minRoyalty: ${minRoyalty}`);
          return res.status(422).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'minRoyalty must be a number between 0 and 100'
          });
        }
        filter.royaltyPercent.$gte = minRoyaltyNum;
      }
    }

    // Filter by license type
    if (licenseType) {
      const validLicenseTypes = ['commercial_remix', 'non_commercial'];
      if (!validLicenseTypes.includes(licenseType as string)) {
        logger.warn(`Invalid licenseType filter: ${licenseType}`);
        return res.status(422).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid licenseType. Must be one of: ${validLicenseTypes.join(', ')}`
        });
      }
      filter.licenseType = licenseType;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [ips, totalCount] = await Promise.all([
      MintToken.find(filter)
        .select('nonce ipId tokenId creatorAddress contentHash ipMetadataURI nftMetadataURI licenseTermsId licenseType royaltyPercent allowDerivatives commercialUse licenseTxHash licenseAttachedAt usedAt')
        .sort({ licenseAttachedAt: -1, usedAt: -1 }) // Most recently finalized first
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MintToken.countDocuments(filter)
    ]);

    // Format response
    const formattedIPs = ips.map((ip: any) => ({
      nonce: ip.nonce,
      ipId: ip.ipId,
      tokenId: ip.tokenId,
      creatorAddress: ip.creatorAddress,
      contentHash: ip.contentHash,
      metadata: {
        ipMetadataURI: ip.ipMetadataURI,
        nftMetadataURI: ip.nftMetadataURI
      },
      license: {
        licenseTermsId: ip.licenseTermsId,
        licenseType: ip.licenseType,
        royaltyPercent: ip.royaltyPercent,
        allowDerivatives: ip.allowDerivatives,
        commercialUse: ip.commercialUse,
        licenseTxHash: ip.licenseTxHash,
        licenseAttachedAt: ip.licenseAttachedAt ? Math.floor(ip.licenseAttachedAt.getTime() / 1000) : null
      },
      registeredAt: ip.usedAt ? Math.floor(ip.usedAt.getTime() / 1000) : null
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    logger.info(`Successfully retrieved ${formattedIPs.length} IPs from marketplace (total: ${totalCount})`);

    return res.status(200).json({
      success: true,
      data: {
        ips: formattedIPs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems: totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1
        },
        filters: {
          status: filter.status,
          commercialUse: filter.commercialUse,
          licenseType: filter.licenseType,
          royaltyRange: {
            min: filter.royaltyPercent?.$gte,
            max: filter.royaltyPercent?.$lte
          }
        }
      }
    });
  } catch (error: any) {
    logger.error(`Error fetching marketplace IPs: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to fetch marketplace IPs'
    });
  }
};

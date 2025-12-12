import { Request, Response } from 'express';
import LicenseTokenMint from '../models/LicenseTokenMint';
import MarketplaceOrder from '../models/MarketplaceOrder';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Record a new license token mint
 * POST /api/license-tokens/mint
 */
export const recordLicenseTokenMint = async (req: Request, res: Response) => {
  logger.info(`recordLicenseTokenMint request: ${JSON.stringify(req.body)}`);
  
  try {
    const {
      licenseTokenId,
      txHash,
      blockNumber,
      ipId,
      ipTokenId,
      licenseTermsId,
      licenseeAddress,
      amount,
      mintingFee,
      currency,
      royaltyPercentage,
      licenseTerms,
      metadata,
    } = req.body;

    // Validate required fields
    if (!licenseTokenId || !txHash || !ipId || !licenseTermsId || !licenseeAddress) {
      return res.status(400).json({
        success: false,
        error: 'LT001',
        message: 'Missing required fields: licenseTokenId, txHash, ipId, licenseTermsId, licenseeAddress',
      });
    }

    // Check if license token already recorded
    const existingLicense = await LicenseTokenMint.findOne({ licenseTokenId });
    if (existingLicense) {
      return res.status(409).json({
        success: false,
        error: 'LT002',
        message: 'License token already recorded',
      });
    }

    // Check if transaction hash already recorded
    const existingTx = await LicenseTokenMint.findOne({ txHash });
    if (existingTx) {
      return res.status(409).json({
        success: false,
        error: 'LT003',
        message: 'Transaction hash already recorded',
      });
    }

    // Create license token mint record
    const timestamp = Math.floor(Date.now() / 1000);
    const licenseTokenMint = new LicenseTokenMint({
      licenseTokenId,
      txHash,
      blockNumber,
      timestamp,
      ipId,
      ipTokenId,
      licenseTermsId,
      licenseeAddress,
      amount: amount || 1,
      mintingFee: mintingFee || '0',
      currency: currency || '0xB132A6B7AE652c974EE1557A3521D53d18F6739f',
      royaltyPercentage: royaltyPercentage || 0,
      licenseTerms: {
        commercialUse: licenseTerms?.commercialUse || false,
        derivativesAllowed: licenseTerms?.derivativesAllowed || false,
        transferable: licenseTerms?.transferable || false,
        expirationDate: licenseTerms?.expirationDate,
        territories: licenseTerms?.territories,
      },
      metadata: {
        ipMetadataURI: metadata?.ipMetadataURI || '',
        nftMetadataURI: metadata?.nftMetadataURI || '',
        ipType: metadata?.ipType || 'Unknown',
        ipTitle: metadata?.ipTitle,
      },
      status: 'active',
      currentOwner: licenseeAddress,
      usageCount: 0,
      derivativeCount: 0,
    });

    await licenseTokenMint.save();

    // Create marketplace order record
    const marketplaceOrder = new MarketplaceOrder({
      orderId: uuidv4(),
      orderType: 'license_purchase',
      txHash,
      blockNumber,
      timestamp,
      buyerAddress: licenseeAddress,
      sellerAddress: ipId, // IP ID as seller
      ipId,
      licenseTokenId,
      amount: mintingFee || '0',
      currency: currency || '0xB132A6B7AE652c974EE1557A3521D53d18F6739f',
      fee: '0',
      status: 'completed',
      metadata: {
        ipTitle: metadata?.ipTitle,
        ipType: metadata?.ipType,
        licenseType: licenseTerms?.commercialUse ? 'commercial' : 'non_commercial',
      },
      completedAt: new Date(),
    });

    await marketplaceOrder.save();

    logger.info(`License token mint recorded successfully: ${licenseTokenId}`);

    return res.status(201).json({
      success: true,
      data: {
        id: licenseTokenMint._id,
        licenseTokenId,
        txHash,
        status: 'active',
        blockNumber,
        timestamp,
        explorerUrl: `https://testnet.storyscan.xyz/tx/${txHash}`,
      },
      message: 'License token mint recorded successfully',
    });
  } catch (error: any) {
    logger.error(`Error recording license token mint: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'LT010',
      message: 'Failed to record license token mint',
    });
  }
};

/**
 * Get license tokens by user
 * GET /api/license-tokens/user/:walletAddress
 */
export const getLicenseTokensByUser = async (req: Request, res: Response) => {
  logger.info(`getLicenseTokensByUser request for: ${req.params.walletAddress}`);
  
  try {
    const { walletAddress } = req.params;
    const {
      status,
      ipType,
      page = '1',
      limit = '20',
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query;

    // Validate wallet address
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'LT009',
        message: 'Invalid wallet address',
      });
    }

    // Build query filter
    const filter: any = { currentOwner: walletAddress.toLowerCase() };

    if (status) {
      filter.status = status;
    }

    if (ipType) {
      filter['metadata.ipType'] = ipType;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortField = sortBy === 'licenseTokenId' ? 'licenseTokenId' : 'timestamp';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [licenses, totalCount] = await Promise.all([
      LicenseTokenMint.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      LicenseTokenMint.countDocuments(filter),
    ]);

    // Format response
    const formattedLicenses = licenses.map((license: any) => ({
      id: license._id,
      licenseTokenId: license.licenseTokenId,
      txHash: license.txHash,
      ipId: license.ipId,
      ipTitle: license.metadata.ipTitle,
      ipType: license.metadata.ipType,
      status: license.status,
      mintedAt: license.timestamp,
      licenseTerms: license.licenseTerms,
      usageCount: license.usageCount,
      derivativeCount: license.derivativeCount,
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        licenses: formattedLicenses,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching user licenses: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'LT010',
      message: 'Failed to fetch user licenses',
    });
  }
};

/**
 * Get license tokens for IP asset
 * GET /api/license-tokens/ip/:ipId
 */
export const getLicenseTokensByIP = async (req: Request, res: Response) => {
  logger.info(`getLicenseTokensByIP request for: ${req.params.ipId}`);
  
  try {
    const { ipId } = req.params;
    const { status, page = '1', limit = '20' } = req.query;

    // Build query filter
    const filter: any = { ipId };

    if (status) {
      filter.status = status;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [licenses, totalCount] = await Promise.all([
      LicenseTokenMint.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      LicenseTokenMint.countDocuments(filter),
    ]);

    // Calculate analytics
    const allLicenses = await LicenseTokenMint.find({ ipId }).lean();
    const uniqueLicensees = new Set(allLicenses.map((l: any) => l.licenseeAddress)).size;
    const totalRevenue = allLicenses.reduce((sum: bigint, l: any) => {
      return sum + BigInt(l.mintingFee || '0');
    }, BigInt(0)).toString();
    const activeLicenses = allLicenses.filter((l: any) => l.status === 'active').length;
    const totalDerivatives = allLicenses.reduce((sum: number, l: any) => sum + l.derivativeCount, 0);
    const lastMintedAt = allLicenses.length > 0 ? Math.max(...allLicenses.map((l: any) => l.timestamp)) : 0;

    // Format response
    const formattedLicenses = licenses.map((license: any) => ({
      licenseTokenId: license.licenseTokenId,
      licenseeAddress: license.licenseeAddress,
      status: license.status,
      mintedAt: license.timestamp,
      usageCount: license.usageCount,
      derivativeCount: license.derivativeCount,
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        ipId,
        licenses: formattedLicenses,
        analytics: {
          totalLicensesMinted: totalCount,
          activeLicenses,
          uniqueLicensees,
          totalRevenue,
          lastMintedAt,
        },
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching IP licenses: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'LT010',
      message: 'Failed to fetch IP licenses',
    });
  }
};

/**
 * Get license token details
 * GET /api/license-tokens/:licenseTokenId
 */
export const getLicenseTokenDetails = async (req: Request, res: Response) => {
  logger.info(`getLicenseTokenDetails request for: ${req.params.licenseTokenId}`);
  
  try {
    const { licenseTokenId } = req.params;

    const license = await LicenseTokenMint.findOne({ licenseTokenId }).lean();

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'LT004',
        message: 'License token not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: license,
    });
  } catch (error: any) {
    logger.error(`Error fetching license token details: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'LT010',
      message: 'Failed to fetch license token details',
    });
  }
};

/**
 * Update license token usage
 * PATCH /api/license-tokens/:licenseTokenId/usage
 */
export const updateLicenseTokenUsage = async (req: Request, res: Response) => {
  logger.info(`updateLicenseTokenUsage request for: ${req.params.licenseTokenId}`);
  
  try {
    const { licenseTokenId } = req.params;
    const { action, derivativeIpId, newOwner } = req.body;

    const license = await LicenseTokenMint.findOne({ licenseTokenId });

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'LT004',
        message: 'License token not found',
      });
    }

    // Update based on action
    if (action === 'derivative_created') {
      license.derivativeCount += 1;
      license.usageCount += 1;
    } else if (action === 'commercial_use') {
      license.usageCount += 1;
    } else if (action === 'transfer') {
      if (!newOwner) {
        return res.status(400).json({
          success: false,
          error: 'LT001',
          message: 'newOwner is required for transfer action',
        });
      }
      license.currentOwner = newOwner;
      license.status = 'transferred';
    }

    await license.save();

    return res.status(200).json({
      success: true,
      data: {
        licenseTokenId: license.licenseTokenId,
        usageCount: license.usageCount,
        derivativeCount: license.derivativeCount,
        status: license.status,
      },
      message: 'License usage updated successfully',
    });
  } catch (error: any) {
    logger.error(`Error updating license usage: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'LT010',
      message: 'Failed to update license usage',
    });
  }
};

/**
 * Get license token analytics for IP
 * GET /api/license-tokens/analytics/ip/:ipId
 */
export const getLicenseTokenAnalytics = async (req: Request, res: Response) => {
  logger.info(`getLicenseTokenAnalytics request for: ${req.params.ipId}`);
  
  try {
    const { ipId } = req.params;
    const { startDate, endDate, groupBy } = req.query;

    // Build query filter
    const filter: any = { ipId };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = parseInt(startDate as string);
      if (endDate) filter.timestamp.$lte = parseInt(endDate as string);
    }

    const licenses = await LicenseTokenMint.find(filter).lean();

    // Calculate overview
    const totalLicensesMinted = licenses.length;
    const activeLicenses = licenses.filter((l: any) => l.status === 'active').length;
    const expiredLicenses = licenses.filter((l: any) => l.status === 'expired').length;
    const revokedLicenses = licenses.filter((l: any) => l.status === 'revoked').length;
    const uniqueLicensees = new Set(licenses.map((l: any) => l.licenseeAddress)).size;
    
    const totalRevenue = licenses.reduce((sum: bigint, l: any) => {
      return sum + BigInt(l.mintingFee || '0');
    }, BigInt(0)).toString();
    
    const averageMintingFee = totalLicensesMinted > 0 
      ? (BigInt(totalRevenue) / BigInt(totalLicensesMinted)).toString()
      : '0';

    const totalDerivatives = licenses.reduce((sum: number, l: any) => sum + l.derivativeCount, 0);
    const activeDerivatives = totalDerivatives; // Simplified

    // Top licensees
    const licenseeMap = new Map<string, any>();
    licenses.forEach((license: any) => {
      const addr = license.licenseeAddress;
      if (!licenseeMap.has(addr)) {
        licenseeMap.set(addr, {
          address: addr,
          licenseCount: 0,
          derivativeCount: 0,
          totalSpent: BigInt(0),
        });
      }
      const data = licenseeMap.get(addr);
      data.licenseCount += 1;
      data.derivativeCount += license.derivativeCount;
      data.totalSpent += BigInt(license.mintingFee || '0');
    });

    const topLicensees = Array.from(licenseeMap.values())
      .sort((a, b) => b.licenseCount - a.licenseCount)
      .slice(0, 10)
      .map(l => ({
        ...l,
        totalSpent: l.totalSpent.toString(),
      }));

    return res.status(200).json({
      success: true,
      data: {
        ipId,
        overview: {
          totalLicensesMinted,
          activeLicenses,
          expiredLicenses,
          revokedLicenses,
          uniqueLicensees,
          totalRevenue,
          totalRevenueUSD: '0', // TODO: Implement price conversion
          averageMintingFee,
          averageMintingFeeUSD: '0', // TODO: Implement price conversion
        },
        derivatives: {
          totalDerivatives,
          activeDerivatives,
          averageDerivativesPerLicense: totalLicensesMinted > 0 
            ? totalDerivatives / totalLicensesMinted 
            : 0,
        },
        topLicensees,
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching license analytics: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'LT010',
      message: 'Failed to fetch license analytics',
    });
  }
};

/**
 * Get global license token statistics
 * GET /api/license-tokens/stats/global
 */
export const getGlobalLicenseStats = async (req: Request, res: Response) => {
  logger.info('getGlobalLicenseStats request');
  
  try {
    const allLicenses = await LicenseTokenMint.find().lean();

    const totalLicensesMinted = allLicenses.length;
    const totalIPsLicensed = new Set(allLicenses.map((l: any) => l.ipId)).size;
    const totalLicensees = new Set(allLicenses.map((l: any) => l.licenseeAddress)).size;
    
    const totalRevenue = allLicenses.reduce((sum: bigint, l: any) => {
      return sum + BigInt(l.mintingFee || '0');
    }, BigInt(0)).toString();
    
    const activeLicenses = allLicenses.filter((l: any) => l.status === 'active').length;
    const totalDerivatives = allLicenses.reduce((sum: number, l: any) => sum + l.derivativeCount, 0);

    // Top IPs
    const ipMap = new Map<string, any>();
    allLicenses.forEach((license: any) => {
      const ipId = license.ipId;
      if (!ipMap.has(ipId)) {
        ipMap.set(ipId, {
          ipId,
          title: license.metadata.ipTitle || 'Unknown',
          licenseCount: 0,
          revenue: BigInt(0),
        });
      }
      const data = ipMap.get(ipId);
      data.licenseCount += 1;
      data.revenue += BigInt(license.mintingFee || '0');
    });

    const topIPs = Array.from(ipMap.values())
      .sort((a, b) => b.licenseCount - a.licenseCount)
      .slice(0, 10)
      .map(ip => ({
        ...ip,
        revenue: ip.revenue.toString(),
      }));

    // Recent mints
    const recentMints = allLicenses
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map((license: any) => ({
        licenseTokenId: license.licenseTokenId,
        ipId: license.ipId,
        ipTitle: license.metadata.ipTitle,
        licenseeAddress: license.licenseeAddress,
        timestamp: license.timestamp,
      }));

    return res.status(200).json({
      success: true,
      data: {
        totalLicensesMinted,
        totalIPsLicensed,
        totalLicensees,
        totalRevenue,
        totalRevenueUSD: '0', // TODO: Implement price conversion
        activeLicenses,
        totalDerivatives,
        topIPs,
        recentMints,
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching global license stats: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'LT010',
      message: 'Failed to fetch global license stats',
    });
  }
};

/**
 * Verify license token ownership
 * GET /api/license-tokens/verify/:licenseTokenId/owner/:walletAddress
 */
export const verifyLicenseTokenOwnership = async (req: Request, res: Response) => {
  logger.info(`verifyLicenseTokenOwnership request: ${req.params.licenseTokenId} - ${req.params.walletAddress}`);
  
  try {
    const { licenseTokenId, walletAddress } = req.params;

    const license = await LicenseTokenMint.findOne({ licenseTokenId }).lean();

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'LT004',
        message: 'License token not found',
      });
    }

    const isOwner = license.currentOwner.toLowerCase() === walletAddress.toLowerCase();
    const isValid = license.status === 'active' && 
      (!license.licenseTerms.expirationDate || license.licenseTerms.expirationDate > Math.floor(Date.now() / 1000));

    return res.status(200).json({
      success: true,
      data: {
        isOwner,
        licenseTokenId,
        status: license.status,
        isValid,
        expiresAt: license.licenseTerms.expirationDate || null,
        licenseTerms: license.licenseTerms,
      },
    });
  } catch (error: any) {
    logger.error(`Error verifying license ownership: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'LT010',
      message: 'Failed to verify license ownership',
    });
  }
};

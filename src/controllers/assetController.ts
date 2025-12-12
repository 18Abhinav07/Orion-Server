import { Request, Response } from 'express';
import IpFingerprint from '../models/IpFingerprint';
import MintToken from '../models/MintToken';
import logger from '../utils/logger';

/**
 * List all assets with pagination and filters
 */
export const listAssets = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const assetType = req.query.assetType as string;

    const filter: any = {};
    if (status) filter.status = status;
    if (assetType) filter.mimeType = new RegExp(assetType, 'i');

    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      IpFingerprint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('creatorUserId', 'walletAddress username')
        .lean(),
      IpFingerprint.countDocuments(filter),
    ]);

    logger.info('Listed assets', { page, limit, total, count: assets.length });

    res.json({
      success: true,
      data: {
        assets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to list assets', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list assets', 
      details: error.message 
    });
  }
};

/**
 * Get single asset by ID (MongoDB _id or sha256Hash)
 */
export const getAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Try to find by MongoDB _id or sha256Hash
    const asset = await IpFingerprint.findOne({
      $or: [{ _id: id }, { sha256Hash: id }],
    })
      .populate('creatorUserId', 'walletAddress username email')
      .populate('matchedParentId')
      .lean();

    if (!asset) {
      return res.status(404).json({ 
        success: false, 
        error: 'Asset not found' 
      });
    }

    logger.info('Retrieved asset', { assetId: id });
    res.json({ 
      success: true, 
      data: { asset } 
    });
  } catch (error: any) {
    logger.error('Failed to get asset', { assetId: req.params.id, error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get asset', 
      details: error.message 
    });
  }
};

/**
 * Get all assets by wallet address
 * Returns both IpFingerprints and MintTokens
 */
export const getAssetsByWallet = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const normalizedAddress = address.toLowerCase();

    // Query both collections
    const fingerprintFilter: any = { creatorWallet: normalizedAddress };
    const mintTokenFilter: any = { creatorAddress: { $regex: new RegExp(`^${address}$`, 'i') } };
    
    if (status) {
      fingerprintFilter.status = status;
      mintTokenFilter.status = status;
    }

    const skip = (page - 1) * limit;

    // Fetch from both collections
    const [fingerprints, mintTokens] = await Promise.all([
      IpFingerprint.find(fingerprintFilter)
        .sort({ createdAt: -1 })
        .populate('matchedParentId', 'storyIpId originalFilename')
        .lean(),
      MintToken.find(mintTokenFilter)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Transform MintTokens to match asset structure
    const transformedMintTokens = mintTokens.map((token: any) => ({
      _id: token._id,
      sha256Hash: token.contentHash,
      originalFilename: `Mint Token #${token.nonce}`,
      mimeType: 'application/json',
      ipfsCid: token.ipMetadataURI?.replace('ipfs://', '') || '',
      ipfsUrl: token.ipMetadataURI || '',
      storyIpId: token.ipId,
      storyTokenId: token.tokenId,
      licenseTermsId: token.licenseTermsId,
      creatorWallet: token.creatorAddress,
      status: token.status,
      isDerivative: false,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      registeredAt: token.usedAt,
      source: 'mintToken',
    }));

    // Combine and sort all assets
    const allAssets = [...fingerprints, ...transformedMintTokens].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const total = allAssets.length;
    const paginatedAssets = allAssets.slice(skip, skip + limit);

    // Separate into categories
    const minted = allAssets.filter((a) => a.status === 'registered' && a.storyIpId);
    const pending = allAssets.filter((a) => a.status === 'pending');
    const disputed = allAssets.filter((a) => a.status === 'disputed');

    logger.info('Retrieved assets by wallet', {
      wallet: address,
      total,
      minted: minted.length,
      pending: pending.length,
      disputed: disputed.length,
      fingerprints: fingerprints.length,
      mintTokens: mintTokens.length,
    });

    res.json({
      success: true,
      data: {
        assets: paginatedAssets,
        summary: {
          total,
          minted: minted.length,
          pending: pending.length,
          disputed: disputed.length,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to get assets by wallet', {
      wallet: req.params.address,
      error: error.message,
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get assets', 
      details: error.message 
    });
  }
};

/**
 * Update asset metadata (status, storyIpId, licenseTermsId, etc.)
 */
export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find asset
    const asset = await IpFingerprint.findOne({
      $or: [{ _id: id }, { sha256Hash: id }],
    });

    if (!asset) {
      return res.status(404).json({ 
        success: false, 
        error: 'Asset not found' 
      });
    }

    // Update allowed fields (no ownership check for fast development)
    const allowedUpdates = [
      'storyIpId',
      'storyTokenId',
      'licenseTermsId',
      'status',
      'isDerivative',
      'parentIpId',
      'registeredAt',
    ];

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        (asset as any)[key] = updates[key];
      }
    });

    await asset.save();

    logger.info('Updated asset', { assetId: id, updates: Object.keys(updates) });
    res.json({ 
      success: true, 
      data: { asset } 
    });
  } catch (error: any) {
    logger.error('Failed to update asset', { assetId: req.params.id, error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update asset', 
      details: error.message 
    });
  }
};

/**
 * Delete asset (admin only)
 */
export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await IpFingerprint.findOneAndDelete({
      $or: [{ _id: id }, { sha256Hash: id }],
    });

    if (!asset) {
      return res.status(404).json({ 
        success: false, 
        error: 'Asset not found' 
      });
    }

    logger.info('Deleted asset', { assetId: id });
    res.json({ 
      success: true, 
      data: { message: 'Asset deleted successfully' } 
    });
  } catch (error: any) {
    logger.error('Failed to delete asset', { assetId: req.params.id, error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete asset', 
      details: error.message 
    });
  }
};

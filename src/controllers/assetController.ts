import { Request, Response } from 'express';
import IpFingerprint from '../models/IpFingerprint';
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
 * Returns minted (registered) and pending assets
 */
export const getAssetsByWallet = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filter: any = { creatorWallet: address.toLowerCase() };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      IpFingerprint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('matchedParentId', 'storyIpId originalFilename')
        .lean(),
      IpFingerprint.countDocuments(filter),
    ]);

    // Separate into categories
    const minted = assets.filter((a) => a.status === 'registered' && a.storyIpId);
    const pending = assets.filter((a) => a.status === 'pending');
    const disputed = assets.filter((a) => a.status === 'disputed');

    logger.info('Retrieved assets by wallet', {
      wallet: address,
      total,
      minted: minted.length,
      pending: pending.length,
      disputed: disputed.length,
    });

    res.json({
      success: true,
      data: {
        assets,
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

    // Verify ownership (unless admin)
    const userWallet = (req as any).user?.walletAddress?.toLowerCase();
    if (asset.creatorWallet !== userWallet && (req as any).user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update this asset' 
      });
    }

    // Update allowed fields
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

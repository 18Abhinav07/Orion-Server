import { Router } from 'express';
import {
  recordLicenseTokenMint,
  getLicenseTokensByUser,
  getLicenseTokensByIP,
  getLicenseTokenDetails,
  updateLicenseTokenUsage,
  getLicenseTokenAnalytics,
  getGlobalLicenseStats,
  verifyLicenseTokenOwnership,
} from '../controllers/licenseTokenController';

const router = Router();

/**
 * @route   POST /api/license-tokens/mint
 * @desc    Record a new license token mint transaction
 * @access  Public
 */
router.post('/mint', recordLicenseTokenMint);

/**
 * @route   GET /api/license-tokens/user/:walletAddress
 * @desc    Get all license tokens owned by a wallet address
 * @access  Public
 * @query   status: Filter by status (active, expired, revoked, transferred)
 * @query   ipType: Filter by IP type (Text, Image, Video, Audio)
 * @query   page: Page number (default: 1)
 * @query   limit: Items per page (default: 20, max: 100)
 * @query   sortBy: Sort field (timestamp, licenseTokenId) (default: timestamp)
 * @query   sortOrder: Sort order (asc, desc) (default: desc)
 */
router.get('/user/:walletAddress', getLicenseTokensByUser);

/**
 * @route   GET /api/license-tokens/ip/:ipId
 * @desc    Get all license tokens for a specific IP asset
 * @access  Public
 * @query   status: Filter by status
 * @query   page: Page number (default: 1)
 * @query   limit: Items per page (default: 20, max: 100)
 */
router.get('/ip/:ipId', getLicenseTokensByIP);

/**
 * @route   GET /api/license-tokens/analytics/ip/:ipId
 * @desc    Get comprehensive analytics for license tokens on an IP asset
 * @access  Public
 * @query   startDate: Start date for analytics (Unix timestamp)
 * @query   endDate: End date for analytics (Unix timestamp)
 * @query   groupBy: Group results by (day, week, month)
 */
router.get('/analytics/ip/:ipId', getLicenseTokenAnalytics);

/**
 * @route   GET /api/license-tokens/stats/global
 * @desc    Get platform-wide license token statistics
 * @access  Public
 */
router.get('/stats/global', getGlobalLicenseStats);

/**
 * @route   GET /api/license-tokens/verify/:licenseTokenId/owner/:walletAddress
 * @desc    Verify if a wallet address owns a license token
 * @access  Public
 */
router.get('/verify/:licenseTokenId/owner/:walletAddress', verifyLicenseTokenOwnership);

/**
 * @route   GET /api/license-tokens/:licenseTokenId
 * @desc    Get complete details for a specific license token
 * @access  Public
 */
router.get('/:licenseTokenId', getLicenseTokenDetails);

/**
 * @route   PATCH /api/license-tokens/:licenseTokenId/usage
 * @desc    Update license token usage statistics
 * @access  Public
 * @body    action: derivative_created | commercial_use | transfer
 * @body    derivativeIpId: Required if action is derivative_created
 * @body    newOwner: Required if action is transfer
 */
router.patch('/:licenseTokenId/usage', updateLicenseTokenUsage);

export default router;

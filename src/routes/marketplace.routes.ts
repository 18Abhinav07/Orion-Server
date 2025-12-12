import express from 'express';
import { getMarketplaceIPs } from '../controllers/marketplaceController';

const router = express.Router();

/**
 * @route   GET /api/marketplace/ips
 * @desc    Get registered IPs with filtering and pagination
 * @access  Public
 * @query   status: Filter by status (registered, used) - default: registered
 * @query   commercialUse: Filter by commercial use (true/false)
 * @query   maxRoyalty: Maximum royalty percentage (0-100)
 * @query   minRoyalty: Minimum royalty percentage (0-100)
 * @query   licenseType: Filter by license type (commercial_remix, non_commercial)
 * @query   page: Page number (default: 1)
 * @query   limit: Items per page (default: 20, max: 100)
 */
router.get('/ips', getMarketplaceIPs);

export default router;

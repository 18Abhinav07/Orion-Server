import express from 'express';
import { findLicenseTerms, cacheLicenseTerms } from '../controllers/licenseTermsController';

const router = express.Router();

/**
 * @route   GET /api/license-terms/find
 * @desc    Find cached license terms by type and royalty
 * @access  Public
 * @query   type: License type (commercial_remix, non_commercial)
 * @query   royalty: Royalty percentage (0-100)
 */
router.get('/find', findLicenseTerms);

/**
 * @route   POST /api/license-terms/cache
 * @desc    Cache newly registered license terms
 * @access  Public
 * @body    licenseType: License type (commercial_remix, non_commercial)
 * @body    royaltyPercent: Royalty percentage (0-100)
 * @body    licenseTermsId: Story Protocol license terms ID
 * @body    transactionHash: Blockchain transaction hash
 */
router.post('/cache', cacheLicenseTerms);

export default router;

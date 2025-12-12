import { Router } from 'express';
import { generateMintToken, getTokenStatus, updateMintToken, revokeToken, finalizeMintToken } from '../controllers/verificationController';
import { protect } from '../middleware/auth';

const router = Router();

// Public endpoints for minting flow (frontend needs access)
router.post('/generate-mint-token', generateMintToken);
router.get('/token/:nonce/status', getTokenStatus);
router.patch('/token/:nonce/update', updateMintToken);

// Protected endpoints (JWT authentication required)
router.patch('/token/:nonce/finalize', protect, finalizeMintToken);

// Protected admin endpoints
router.post('/revoke-token', protect, revokeToken);

export default router;

import { Router } from 'express';
import { generateMintToken, getTokenStatus, revokeToken } from '../controllers/verificationController';
import { protect } from '../middleware/auth';

const router = Router();

// All verification routes should be protected
router.use(protect);

router.post('/generate-mint-token', generateMintToken);
router.get('/token/:nonce/status', getTokenStatus);
router.post('/revoke-token', revokeToken);

export default router;

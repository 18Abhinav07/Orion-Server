import { Router } from 'express';
import { generateMintToken, getTokenStatus, updateMintToken, revokeToken, finalizeMintToken } from '../controllers/verificationController';

const router = Router();

// All endpoints are now public for development
router.post('/generate-mint-token', generateMintToken);
router.get('/token/:nonce/status', getTokenStatus);
router.patch('/token/:nonce/update', updateMintToken);
router.patch('/token/:nonce/finalize', finalizeMintToken);
router.post('/revoke-token', revokeToken);

export default router;

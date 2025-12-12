import { Router } from 'express';
import { generateMintToken, getTokenStatus, updateMintToken, revokeToken, finalizeMintToken } from '../controllers/verificationController';
import { getAssetsByWallet } from '../controllers/assetController';

const router = Router();

// All endpoints are now public for development
router.post('/generate-mint-token', generateMintToken);
router.get('/token/:nonce/status', getTokenStatus);
router.patch('/token/:nonce/update', updateMintToken);
router.patch('/token/:nonce/finalize', finalizeMintToken);
router.post('/revoke-token', revokeToken);

// User assets endpoint
router.get('/user/:address/assets', getAssetsByWallet);

export default router;

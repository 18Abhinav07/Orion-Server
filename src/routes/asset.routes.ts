import { Router } from 'express';
import {
  listAssets,
  getAsset,
  getAssetsByWallet,
  updateAsset,
  deleteAsset,
} from '../controllers/assetController';

const router = Router();

// All asset routes are now unprotected for fast development
router.get('/', listAssets);
router.get('/wallet/:address', getAssetsByWallet);
router.get('/:id', getAsset);
router.patch('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export default router;

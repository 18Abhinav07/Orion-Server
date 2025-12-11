import { Router } from 'express';
import {
  listAssets,
  getAsset,
  getAssetsByWallet,
  updateAsset,
  deleteAsset,
} from '../controllers/assetController';
import { protect } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleCheck';

const router = Router();

// All asset routes are protected
router.use(protect);

router.get('/', listAssets);
router.get('/:id', getAsset);
router.get('/wallet/:address', getAssetsByWallet);
router.patch('/:id', updateAsset);

// Deleting an asset should be an admin-only action
router.delete('/:id', requireAdmin, deleteAsset);

export default router;

import { Router } from 'express';
import {
  createFingerprint,
  getFingerprint,
  getFingerprintByHash,
  deleteFingerprint,
} from '../controllers/fingerprintController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Apply auth middleware to all routes in this file
router.use(protect);

router.post('/', upload.single('file'), createFingerprint);
router.get('/:id', getFingerprint);
router.get('/hash/:hash', getFingerprintByHash);
router.delete('/:id', deleteFingerprint);

export default router;

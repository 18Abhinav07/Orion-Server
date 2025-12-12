import { Router } from 'express';
import {
  createFingerprint,
  getFingerprint,
  getFingerprintByHash,
  deleteFingerprint,
} from '../controllers/fingerprintController';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', upload.single('file'), createFingerprint);
router.get('/:id', getFingerprint);
router.get('/hash/:hash', getFingerprintByHash);
router.delete('/:id', deleteFingerprint);

export default router;

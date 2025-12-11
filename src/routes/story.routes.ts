import { Router } from 'express';
import {
  registerIp,
  attachLicense,
  registerDerivative,
  mintLicenseToken,
  getIp,
} from '../controllers/storyController';
import { protect } from '../middleware/auth';

const router = Router();

// All Story Protocol interactions should be protected
router.use(protect);

router.post('/register-ip', registerIp);
router.post('/attach-license', attachLicense);
router.post('/register-derivative', registerDerivative);
router.post('/mint-license-token', mintLicenseToken);
router.get('/ip/:ipId', getIp);

export default router;

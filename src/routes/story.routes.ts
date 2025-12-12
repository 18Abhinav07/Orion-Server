import { Router } from 'express';
import {
  registerIp,
  attachLicense,
  registerDerivative,
  mintLicenseToken,
  getIp,
} from '../controllers/storyController';

const router = Router();

router.post('/register-ip', registerIp);
router.post('/attach-license', attachLicense);
router.post('/register-derivative', registerDerivative);
router.post('/mint-license-token', mintLicenseToken);
router.get('/ip/:ipId', getIp);

export default router;

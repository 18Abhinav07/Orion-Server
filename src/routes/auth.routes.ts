import { Router } from 'express';
import { walletLogin, walletVerify, getProfile, logout } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/wallet-login', walletLogin);
router.post('/wallet-verify', walletVerify);
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);

export default router;

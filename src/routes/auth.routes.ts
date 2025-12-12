import { Router } from 'express';
import { walletLogin, walletVerify, getProfile, logout } from '../controllers/authController';

const router = Router();

router.post('/wallet-login', walletLogin);
router.post('/wallet-verify', walletVerify);
router.get('/profile', getProfile);
router.post('/logout', logout);

export default router;

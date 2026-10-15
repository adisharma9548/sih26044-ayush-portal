import { Router } from 'express';
import {
  login,
  signup,
  sendRegistrationOtp,
  forgotPassword,
  verifyResetOtp,
  resetPasswordWithToken,
  resetPasswordWithOtp,
  getMe,
  request2faOtp,
  verify2faOtp,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/send-otp', sendRegistrationOtp);
router.post('/signup', signup);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPasswordWithToken);
router.get('/me', authenticate, getMe);

// 2FA Foundation Endpoints
router.post('/2fa/email/request', authenticate, request2faOtp);
router.post('/2fa/email/verify', authenticate, verify2faOtp);

export default router;

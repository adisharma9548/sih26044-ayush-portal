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

export default router;

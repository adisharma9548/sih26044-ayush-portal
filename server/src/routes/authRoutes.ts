import { Router } from 'express';
import { login, signup, sendRegistrationOtp, forgotPassword, resetPasswordWithOtp, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/send-otp', sendRegistrationOtp);
router.post('/signup', signup);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);
router.get('/me', authenticate, getMe);

export default router;

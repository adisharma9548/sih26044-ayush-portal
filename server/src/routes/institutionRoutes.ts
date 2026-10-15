import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getInstitutionStatus,
  submitInstitutionClaimRequest,
} from '../controllers/institutionController';
import {
  getInstitutionAnalytics,
  getInstitutionStudents,
  updateInstitutionProfile,
} from '../controllers/institutionDashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many claim requests from this IP. Please try again after 15 minutes.',
    },
  },
});

// Dedicated Institution Dashboard and scoped analytics (OWASP API5: BFLA Protection)
router.get('/dashboard/analytics', authenticate, authorize('institution', 'academician', 'admin'), getInstitutionAnalytics);
router.get('/dashboard/students', authenticate, authorize('institution', 'academician', 'admin'), getInstitutionStudents);
router.patch('/profile', authenticate, authorize('institution', 'admin'), updateInstitutionProfile);

// Public Claim & Status (Protected with rate limiting)
router.get('/:slug/status', getInstitutionStatus);
router.post('/:slug/claim-request', claimLimiter, submitInstitutionClaimRequest);

export default router;

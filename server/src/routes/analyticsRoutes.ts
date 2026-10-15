import { Router } from 'express';
import {
  getStudentAnalytics,
  getCompanyAnalytics,
  getAdminAnalytics,
} from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/student', authenticate, getStudentAnalytics);
router.get('/company', authenticate, authorize('industry', 'admin'), getCompanyAnalytics);
router.get('/admin', authenticate, authorize('admin'), getAdminAnalytics);

export default router;

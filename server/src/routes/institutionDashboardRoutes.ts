import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getInstitutionAnalytics,
  getInstitutionStudents,
  updateInstitutionProfile,
} from '../controllers/institutionDashboardController';

const router = Router();

router.get('/dashboard/analytics', authenticate, getInstitutionAnalytics);
router.get('/dashboard/students', authenticate, getInstitutionStudents);
router.patch('/profile', authenticate, updateInstitutionProfile);

export default router;

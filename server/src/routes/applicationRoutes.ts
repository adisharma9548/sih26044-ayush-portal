import { Router } from 'express';
import {
  getMyApplications,
  getCompanyApplicants,
  updateApplicationStatus,
} from '../controllers/applicationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/my', authenticate, getMyApplications);
router.get('/company', authenticate, authorize('industry', 'admin'), getCompanyApplicants);
router.patch('/:id/status', authenticate, authorize('industry', 'admin'), updateApplicationStatus);

export default router;

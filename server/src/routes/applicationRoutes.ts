import { Router } from 'express';
import {
  getMyApplications,
  getCompanyApplicants,
  updateApplicationStatus,
} from '../controllers/applicationController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/my', optionalAuthenticate, getMyApplications);
router.get('/company', optionalAuthenticate, getCompanyApplicants);
router.patch('/:id/status', optionalAuthenticate, updateApplicationStatus);

export default router;

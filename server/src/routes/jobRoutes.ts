import { Router } from 'express';
import {
  getAllJobs,
  getJobById,
  createJob,
  applyJob,
} from '../controllers/jobController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllJobs);
router.get('/:id', getJobById);
router.post('/', authenticate, authorize('industry', 'admin'), createJob);
router.post('/:id/apply', authenticate, applyJob);

export default router;

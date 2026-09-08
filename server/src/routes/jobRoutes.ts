import { Router } from 'express';
import {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  applyJob,
} from '../controllers/jobController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllJobs);
router.get('/:id', getJobById);
router.post('/', authenticate, authorize('industry', 'admin'), createJob);
router.put('/:id', authenticate, authorize('industry', 'admin'), updateJob);
router.delete('/:id', authenticate, authorize('industry', 'admin'), deleteJob);
router.post('/:id/apply', authenticate, applyJob);

export default router;

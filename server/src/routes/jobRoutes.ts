import { Router } from 'express';
import {
  getAllJobs,
  getJobById,
  createJob,
  applyJob,
} from '../controllers/jobController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/', getAllJobs);
router.get('/:id', getJobById);
router.post('/', optionalAuthenticate, createJob);
router.post('/:id/apply', optionalAuthenticate, applyJob);

export default router;

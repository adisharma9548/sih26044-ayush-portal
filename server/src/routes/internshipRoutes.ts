import { Router } from 'express';
import {
  getAllInternships,
  getInternshipById,
  createInternship,
  applyInternship,
} from '../controllers/internshipController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllInternships);
router.get('/:id', getInternshipById);
router.post('/', authenticate, authorize('industry', 'admin'), createInternship);
router.post('/:id/apply', authenticate, applyInternship);

export default router;

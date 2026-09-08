import { Router } from 'express';
import {
  getAllInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
  applyInternship,
} from '../controllers/internshipController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllInternships);
router.get('/:id', getInternshipById);
router.post('/', authenticate, authorize('industry', 'admin'), createInternship);
router.put('/:id', authenticate, authorize('industry', 'admin'), updateInternship);
router.delete('/:id', authenticate, authorize('industry', 'admin'), deleteInternship);
router.post('/:id/apply', authenticate, applyInternship);

export default router;

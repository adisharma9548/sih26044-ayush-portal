import { Router } from 'express';
import {
  getAllInternships,
  getInternshipById,
  createInternship,
  applyInternship,
} from '../controllers/internshipController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/', getAllInternships);
router.get('/:id', getInternshipById);
router.post('/', optionalAuthenticate, createInternship);
router.post('/:id/apply', optionalAuthenticate, applyInternship);

export default router;

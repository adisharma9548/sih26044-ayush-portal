import { Router } from 'express';
import {
  getFacultyOpportunities,
  getWorkshops,
  createWorkshop,
  getMentorshipRequests,
  updateMentorshipStatus,
} from '../controllers/academicianController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/opportunities', getFacultyOpportunities);
router.get('/workshops', getWorkshops);
router.post('/workshops', authenticate, authorize('academician', 'admin'), createWorkshop);
router.get('/mentorship/requests', authenticate, authorize('academician', 'admin'), getMentorshipRequests);
router.patch('/mentorship/requests/:id', authenticate, authorize('academician', 'admin'), updateMentorshipStatus);

export default router;

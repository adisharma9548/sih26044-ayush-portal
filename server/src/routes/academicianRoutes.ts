import { Router } from 'express';
import {
  getFacultyOpportunities,
  getWorkshops,
  createWorkshop,
  getMentorshipRequests,
  updateMentorshipStatus,
} from '../controllers/academicianController';

const router = Router();

router.get('/opportunities', getFacultyOpportunities);
router.get('/workshops', getWorkshops);
router.post('/workshops', createWorkshop);
router.get('/mentorship/requests', getMentorshipRequests);
router.patch('/mentorship/requests/:id', updateMentorshipStatus);

export default router;

import { Router } from 'express';
import {
  getFacultyOpportunities,
  createFacultyOpportunity,
  applyFacultyOpportunity,
  getIndustryFacultyOpportunities,
  updateFacultyApplicationStatus,
  getWorkshops,
  createWorkshop,
  getMentorshipRequests,
  updateMentorshipStatus,
  getInstitutionalStudents,
  getStudentDetailedProfile,
  assistStudentProject,
} from '../controllers/academicianController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Faculty Opportunities & Industry Immersion
router.get('/opportunities', getFacultyOpportunities);
router.post('/opportunities', authenticate, authorize('industry', 'admin'), createFacultyOpportunity);
router.post('/opportunities/:id/apply', authenticate, authorize('academician', 'admin'), applyFacultyOpportunity);
router.get('/opportunities/my-postings', authenticate, authorize('industry', 'admin'), getIndustryFacultyOpportunities);
router.patch('/opportunities/:oppId/applications/:appId', authenticate, authorize('industry', 'admin'), updateFacultyApplicationStatus);

router.get('/workshops', getWorkshops);
router.post('/workshops', authenticate, authorize('academician', 'admin'), createWorkshop);
router.get('/mentorship/requests', authenticate, authorize('academician', 'admin'), getMentorshipRequests);
router.patch('/mentorship/requests/:id', authenticate, authorize('academician', 'admin'), updateMentorshipStatus);

// Institutional (.edu.in) Student Profile & Project Assistance
router.get('/students', authenticate, authorize('academician', 'admin'), getInstitutionalStudents);
router.get('/students/:studentId', authenticate, authorize('academician', 'admin'), getStudentDetailedProfile);
router.post('/students/:studentId/assist-project', authenticate, authorize('academician', 'admin'), assistStudentProject);

export default router;


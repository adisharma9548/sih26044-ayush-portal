import { Router } from 'express';
import {
  getAllLearningPrograms,
  enrollLearningProgram,
  createLearningProgram,
  getCourseWorkspace,
  updateCourseProgress,
  getCourseCertificate,
  getManagedLearningPrograms,
  getProgramEnrollees,
  deleteLearningProgram,
  getLearningRecommendations,
} from '../controllers/learningController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/programs', getAllLearningPrograms);
router.get('/recommendations', authenticate, getLearningRecommendations);
router.post('/programs', authenticate, authorize('industry', 'academician', 'admin'), createLearningProgram);
router.post('/programs/:id/enroll', authenticate, enrollLearningProgram);

// Industry & Academic Management & Analytics
router.get('/manage', authenticate, authorize('industry', 'academician', 'admin'), getManagedLearningPrograms);
router.get('/programs/:id/enrollees', authenticate, authorize('industry', 'academician', 'admin'), getProgramEnrollees);
router.delete('/programs/:id', authenticate, authorize('industry', 'academician', 'admin'), deleteLearningProgram);

// Personalized Learning Workspace & Progress (Anti-cheat & private module track)
router.get('/course/:id/workspace', authenticate, getCourseWorkspace);
router.post('/course/:id/progress', authenticate, updateCourseProgress);
router.get('/certificate/:certId', getCourseCertificate);

export default router;


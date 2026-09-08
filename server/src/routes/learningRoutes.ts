import { Router } from 'express';
import {
  getAllLearningPrograms,
  enrollLearningProgram,
  createLearningProgram,
  getCourseWorkspace,
  updateCourseProgress,
  getCourseCertificate,
} from '../controllers/learningController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/programs', getAllLearningPrograms);
router.post('/programs', createLearningProgram);
router.post('/programs/:id/enroll', enrollLearningProgram);

// Personalized Learning Workspace & Progress (Anti-cheat & private module track)
router.get('/course/:id/workspace', authenticate, getCourseWorkspace);
router.post('/course/:id/progress', authenticate, updateCourseProgress);
router.get('/certificate/:certId', getCourseCertificate);

export default router;


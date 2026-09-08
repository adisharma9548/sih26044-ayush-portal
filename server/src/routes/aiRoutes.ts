import { Router } from 'express';
import { getDiagnosticQuestions, submitDiagnosticAnswers, getStudyTimeline, getRoadmapsForSkills } from '../controllers/aiController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/diagnostic', optionalAuthenticate, getDiagnosticQuestions);
router.post('/diagnostic/submit', authenticate, submitDiagnosticAnswers);
router.post('/study-timeline', optionalAuthenticate, getStudyTimeline);
router.get('/roadmaps', optionalAuthenticate, getRoadmapsForSkills);
router.post('/roadmaps', optionalAuthenticate, getRoadmapsForSkills);

export default router;

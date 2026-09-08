import { Router } from 'express';
import {
  getProfile,
  getQuestions,
  submitAssessment,
  getPortfolioData,
  addPortfolioProject,
} from '../controllers/skillController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.get('/assessment/questions', getQuestions);
router.post('/assessment/submit', authenticate, submitAssessment);
router.get('/portfolio', authenticate, getPortfolioData);
router.post('/portfolio/projects', authenticate, addPortfolioProject);

export default router;

import { Router } from 'express';
import {
  getDiagnosticQuestions,
  submitDiagnosticAnswers,
  getStudyTimeline,
  getRoadmapsForSkills,
  getSpecializations,
  generateOpportunityDraftController,
  generateProposalDraftController,
  evaluateProposalSynergyController,
  generateLearningModuleDraftController,
  generateLearningMarketInsightController,
  synthesizeMouTermsController,
  generateLearningTitlesController,
} from '../controllers/aiController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/specializations', optionalAuthenticate, getSpecializations);
router.get('/diagnostic', optionalAuthenticate, getDiagnosticQuestions);
router.post('/diagnostic/submit', authenticate, submitDiagnosticAnswers);
router.post('/study-timeline', optionalAuthenticate, getStudyTimeline);
router.get('/roadmaps', optionalAuthenticate, getRoadmapsForSkills);
router.post('/roadmaps', optionalAuthenticate, getRoadmapsForSkills);

// Dynamic AI Generation & Evaluation for Industry & Academia
router.post('/opportunity-draft', optionalAuthenticate, generateOpportunityDraftController);
router.post('/proposal-draft', optionalAuthenticate, generateProposalDraftController);
router.post('/proposal-synergy', optionalAuthenticate, evaluateProposalSynergyController);
router.post('/learning-draft', optionalAuthenticate, generateLearningModuleDraftController);
router.post('/learning-insight', optionalAuthenticate, generateLearningMarketInsightController);
router.post('/mou-synthesize', optionalAuthenticate, synthesizeMouTermsController);
router.post('/learning-titles', optionalAuthenticate, generateLearningTitlesController);

export default router;

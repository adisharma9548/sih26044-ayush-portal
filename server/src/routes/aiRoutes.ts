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

// Dynamic AI Generation & Evaluation for Industry & Academia (OWASP API4: Unrestricted Resource Consumption mitigation)
router.post('/opportunity-draft', authenticate, generateOpportunityDraftController);
router.post('/proposal-draft', authenticate, generateProposalDraftController);
router.post('/proposal-synergy', authenticate, evaluateProposalSynergyController);
router.post('/learning-draft', authenticate, generateLearningModuleDraftController);
router.post('/learning-insight', authenticate, generateLearningMarketInsightController);
router.post('/mou-synthesize', authenticate, synthesizeMouTermsController);
router.post('/learning-titles', authenticate, generateLearningTitlesController);

export default router;

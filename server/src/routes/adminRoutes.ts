import { Router } from 'express';
import {
  getDashboardStats,
  getPartners,
  approvePartner,
  blockPartner,
  getProgressAnalytics,
  getReportsAnalytics,
  getStudents,
  getAdminQuestions,
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  provisionDemoAccount,
} from '../controllers/adminController';
import {
  getAdminInstitutionClaims,
  approveInstitutionClaim,
} from '../controllers/institutionController';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Public / Semi-public aggregated metrics
router.get('/stats', getDashboardStats);
router.get('/dashboard-stats', getDashboardStats);
router.get('/partners', optionalAuthenticate, getPartners);

// Protected Admin Actions (OWASP A01: Broken Access Control Prevention)
router.patch('/partners/:id/approve', authenticate, authorize('admin'), approvePartner);
router.patch('/partners/:id/block', authenticate, authorize('admin'), blockPartner);
router.get('/progress', authenticate, authorize('admin'), getProgressAnalytics);
router.get('/reports', authenticate, authorize('admin'), getReportsAnalytics);
router.get('/students', authenticate, authorize('admin'), getStudents);

// Question Bank Moderation
router.get('/questions', authenticate, authorize('admin'), getAdminQuestions);
router.post('/questions', authenticate, authorize('admin'), createAdminQuestion);
router.patch('/questions/:id', authenticate, authorize('admin'), updateAdminQuestion);
router.delete('/questions/:id', authenticate, authorize('admin'), deleteAdminQuestion);

// Demo Account Provisioning
router.post('/demo-accounts/provision', authenticate, authorize('admin'), provisionDemoAccount);

// Institution Verification Claims
router.get('/institution-claims', authenticate, authorize('admin'), getAdminInstitutionClaims);
router.post('/institution-claims/:id/approve', authenticate, authorize('admin'), approveInstitutionClaim);

export default router;

import { Router } from 'express';
import {
  getDashboardStats,
  getPartners,
  approvePartner,
  blockPartner,
  getProgressAnalytics,
  getReportsAnalytics,
  getStudents,
} from '../controllers/adminController';
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

export default router;

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

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/dashboard-stats', getDashboardStats);
router.get('/partners', getPartners);
router.patch('/partners/:id/approve', approvePartner);
router.patch('/partners/:id/block', blockPartner);
router.get('/progress', getProgressAnalytics);
router.get('/reports', getReportsAnalytics);
router.get('/students', getStudents);

export default router;

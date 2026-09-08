import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import internshipRoutes from './internshipRoutes';
import jobRoutes from './jobRoutes';
import skillRoutes from './skillRoutes';
import learningRoutes from './learningRoutes';
import applicationRoutes from './applicationRoutes';
import notificationRoutes from './notificationRoutes';
import academicianRoutes from './academicianRoutes';
import adminRoutes from './adminRoutes';
import meetingRoutes from './meetingRoutes';
import aiRoutes from './aiRoutes';
import mouRoutes from './mouRoutes';
import ugcDegreeRoutes from './ugcDegreeRoutes';

const router = Router();

// Health Check Endpoint (never exposes secrets)
router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? 'connected' :
    dbState === 2 ? 'connecting' :
    dbState === 3 ? 'disconnecting' : 'disconnected';

  res.json({
    status: 'ok',
    service: 'SIH26044-Ayush-Portal-Backend',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    version: '1.0.0',
  });
});

// Mount Module Sub-routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/internships', internshipRoutes);
router.use('/jobs', jobRoutes);
router.use('/skills', skillRoutes);
router.use('/learning', learningRoutes);
router.use('/applications', applicationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/academician', academicianRoutes);
router.use('/admin', adminRoutes);
router.use('/meetings', meetingRoutes);
router.use('/ai', aiRoutes);
router.use('/mous', mouRoutes);
router.use('/degrees', ugcDegreeRoutes);

export default router;

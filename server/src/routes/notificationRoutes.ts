import { Router } from 'express';
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAllNotifications);
router.patch('/:id/read', authenticate, markAsRead);
router.patch('/read-all', authenticate, markAllAsRead);
router.delete('/', authenticate, clearAllNotifications);

export default router;

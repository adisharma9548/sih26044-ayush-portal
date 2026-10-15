import { Router } from 'express';
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAllNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.patch('/read-all', authenticate, markAllAsRead);
router.patch('/:id/read', authenticate, markAsRead);
router.delete('/', authenticate, clearAllNotifications);

export default router;

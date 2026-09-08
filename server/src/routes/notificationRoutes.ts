import { Router } from 'express';
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from '../controllers/notificationController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuthenticate, getAllNotifications);
router.patch('/:id/read', optionalAuthenticate, markAsRead);
router.patch('/read-all', optionalAuthenticate, markAllAsRead);
router.delete('/', optionalAuthenticate, clearAllNotifications);

export default router;

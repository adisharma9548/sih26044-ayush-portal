import { Router } from 'express';
import {
  scheduleMeeting,
  getMyMeetings,
  getMeetingById,
  updateMeetingStatus,
  endMeeting,
  deleteMeeting,
} from '../controllers/meetingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, scheduleMeeting);
router.get('/', authenticate, getMyMeetings);
router.get('/:id', authenticate, getMeetingById);
router.patch('/:id/status', authenticate, updateMeetingStatus);
router.post('/:id/end', authenticate, endMeeting);
router.delete('/:id', authenticate, deleteMeeting);

export default router;

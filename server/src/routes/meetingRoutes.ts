import { Router } from 'express';
import { scheduleMeeting, getMyMeetings, getMeetingById, updateMeetingStatus } from '../controllers/meetingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, scheduleMeeting);
router.get('/', authenticate, getMyMeetings);
router.get('/:id', authenticate, getMeetingById);
router.patch('/:id/status', authenticate, updateMeetingStatus);

export default router;

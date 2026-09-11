import { Router } from 'express';
import { updateProfile, uploadDocument, uploadAvatar, removeAvatar, getCandidates, changePassword } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/candidates', authenticate, getCandidates);
router.put('/:userId/profile', authenticate, updateProfile);
router.patch('/password', authenticate, changePassword);
router.patch('/:userId/password', authenticate, changePassword);
router.post('/upload', authenticate, upload.single('file'), uploadDocument);
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticate, removeAvatar);

export default router;

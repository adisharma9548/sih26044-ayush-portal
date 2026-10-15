import { Router } from 'express';
import { auth, optionalAuth } from '../middleware/auth';
import {
  getCareerRoles,
  getCareerRoleById,
  analyzeTargetRoleGap,
} from '../controllers/careerRoleController';

const router = Router();

router.get('/', optionalAuth, getCareerRoles);
router.get('/:id', getCareerRoleById);
router.post('/gap-analysis', auth, analyzeTargetRoleGap);

export default router;

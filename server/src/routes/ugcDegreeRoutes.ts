import { Router } from 'express';
import { getUGCDegrees } from '../controllers/ugcDegreeController';

const router = Router();

// Public search for UGC approved degrees and fields
router.get('/search', getUGCDegrees);

export default router;

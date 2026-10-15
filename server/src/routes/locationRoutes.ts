import { Router } from 'express';
import { getStates, getDistricts, normalizeLocation } from '../controllers/locationController';

const router = Router();

router.get('/states', getStates);
router.get('/districts', getDistricts);
router.post('/normalize', normalizeLocation);

export default router;

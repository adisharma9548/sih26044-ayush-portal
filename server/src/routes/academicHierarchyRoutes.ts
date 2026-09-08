import { Router } from 'express';
import {
  searchInstitutions,
  getPrograms,
  getHierarchy,
  validateCombination,
} from '../controllers/academicHierarchyController';

const router = Router();

// Public routes for registration and profile management
router.get('/institutions', searchInstitutions);
router.get('/programs', getPrograms);
router.get('/hierarchy', getHierarchy);
router.post('/validate', validateCombination);

export default router;

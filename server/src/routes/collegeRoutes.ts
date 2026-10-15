import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  searchCollegeHandler,
  discoverCollegeHandler,
  getCollegeBySlugHandler,
  refreshCollegeHandler,
  claimCollegeHandler,
  listCollegesHandler,
  requestCollegeHandler,
} from '../controllers/collegeController';
import { auth } from '../middleware/auth';

const router = Router();

// Search rate limit: 10 requests per minute per IP
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests from this IP. Please wait a minute before trying again.',
    },
  },
});

// Discovery rate limit: 3 requests per minute per IP
const discoveryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many college discovery requests from this IP. Please wait a minute before trying again.',
    },
  },
});

router.get('/', listCollegesHandler);
router.post('/request', auth, requestCollegeHandler);
router.post('/search', searchLimiter, searchCollegeHandler);
router.post('/discover', discoveryLimiter, discoverCollegeHandler);
router.get('/:slug', getCollegeBySlugHandler);
router.post('/:slug/refresh', discoveryLimiter, refreshCollegeHandler);
router.post('/:slug/claim', claimCollegeHandler);

export default router;

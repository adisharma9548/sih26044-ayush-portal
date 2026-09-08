import { Router } from 'express';
import {
  createProposal,
  getProposals,
  reviewProposal,
} from '../controllers/mouController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/propose', authenticate, createProposal);
router.get('/', authenticate, getProposals);
router.put('/:id/review', authenticate, reviewProposal);

export default router;

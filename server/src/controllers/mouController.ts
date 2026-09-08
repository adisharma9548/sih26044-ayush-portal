import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MouProposal } from '../models/MouProposal';
import { Partner } from '../models/Partner';
import { Notification } from '../models/Notification';
import { emitToUser } from '../services/socketService';
import { recordAuditLog } from '../services/auditService';

export const createProposal = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const {
      targetOrganization,
      title,
      scope,
      ipTerms,
      internshipQuota = 10,
      grantFunding = '₹0',
      validityYears = 3,
    } = req.body;

    if (!targetOrganization || !title || !scope || !ipTerms) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required MoU proposal fields' } });
    }

    const proposal = new MouProposal({
      initiatorId: user._id,
      initiatorName: user.name,
      initiatorRole: user.role,
      initiatorInstitution: user.institution || user.name,
      targetOrganization,
      title,
      scope,
      ipTerms,
      internshipQuota: Number(internshipQuota),
      grantFunding,
      validityYears: Number(validityYears),
      status: 'submitted',
    });

    await proposal.save();

    await recordAuditLog({
      action: 'MOU_PROPOSAL_SUBMITTED',
      userId: user._id.toString(),
      userRole: user.role,
      entity: 'MouProposal',
      entityId: proposal._id.toString(),
      details: { title, targetOrganization },
    });

    res.status(201).json({ data: proposal });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getProposals = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    let filter: any = {};
    if (user.role !== 'admin') {
      filter = {
        $or: [
          { initiatorId: user._id },
          { targetOrganization: { $regex: user.institution || user.name || '---', $options: 'i' } },
        ],
      };
    }

    const proposals = await MouProposal.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ data: proposals });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const reviewProposal = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid review status' } });
    }

    const proposal = await MouProposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'MoU Proposal not found' } });
    }

    const isTargetInstMatch = Boolean(
      user.institution &&
      proposal.targetOrganization &&
      proposal.targetOrganization.toLowerCase().includes(user.institution.toLowerCase())
    );

    if (user.role !== 'admin' && !isTargetInstMatch) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only designated institutional representatives or administrators can review MoUs' } });
    }

    proposal.status = status;
    proposal.reviewedBy = user._id;
    proposal.reviewedAt = new Date();
    proposal.reviewNotes = reviewNotes || '';

    if (status === 'approved') {
      proposal.digitalSealId = `MOU-SEAL-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Update or create Partner record
      const partnerName = proposal.initiatorRole === 'industry' ? proposal.initiatorInstitution : proposal.targetOrganization;
      const existingPartner = await Partner.findOne({ name: partnerName });
      const validYear = new Date().getFullYear() + proposal.validityYears;

      if (existingPartner) {
        existingPartner.mouStatus = 'Active Approved MoU';
        existingPartner.mouValidUntil = `${validYear}-12-31`;
        existingPartner.status = 'Approved';
        await existingPartner.save();
      } else {
        const newPartner = new Partner({
          name: partnerName,
          category: 'Accredited Industry Partner',
          location: 'National Directorate Network',
          mouStatus: 'Active Approved MoU',
          mouValidUntil: `${validYear}-12-31`,
          activeInterns: proposal.internshipQuota,
          totalHired: 0,
          status: 'Approved',
        });
        await newPartner.save();
      }
    }

    await proposal.save();

    // Send notification to proposal initiator
    const notif = new Notification({
      userId: proposal.initiatorId,
      title: `MoU Proposal ${status.toUpperCase()}!`,
      message: `Your MoU proposal "${proposal.title}" has been ${status} by the National Institutional Directorate.${proposal.digitalSealId ? ` Official Digital Seal: ${proposal.digitalSealId}` : ''}`,
      type: status === 'approved' ? 'achievement' : 'alert',
      link: proposal.initiatorRole === 'academician' ? '/academician/opportunities' : '/industry/dashboard',
    });
    await notif.save();
    emitToUser(proposal.initiatorId.toString(), 'notification:new', notif);

    await recordAuditLog({
      action: 'MOU_PROPOSAL_REVIEWED',
      userId: user._id.toString(),
      userRole: 'admin',
      entity: 'MouProposal',
      entityId: proposal._id.toString(),
      details: { status, digitalSealId: proposal.digitalSealId },
    });

    res.json({ data: proposal });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

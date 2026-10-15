import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { College } from '../models/College';
import { InstitutionClaim } from '../models/InstitutionClaim';
import { recordAuditLog } from '../services/auditService';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { emitToUser } from '../services/socketService';

/**
 * GET /api/institution/:slug/status
 * Output: { verificationStatus }
 */
export const getInstitutionStatus = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const cleanSlug = (slug || '').toLowerCase().trim();

    const college = await College.findOne({ slug: cleanSlug });
    if (!college) {
      return res.status(404).json({
        error: { code: 'INSTITUTION_NOT_FOUND', message: 'Institution identity not found' },
      });
    }

    res.json({
      data: {
        slug: college.slug,
        name: college.name,
        verificationStatus: college.verificationStatus,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * POST /api/institution/:slug/claim-request
 * Input: { representativeName, email, verificationCode }
 * Output: { requestId, adminReviewUrl }
 */
export const submitInstitutionClaimRequest = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { representativeName, email, verificationCode } = req.body;

    if (!representativeName || !email || !verificationCode) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Representative name, institutional email, and verification code are required.',
        },
      });
    }

    const cleanSlug = slug.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

    const college = await College.findOne({ slug: cleanSlug });
    if (!college) {
      return res.status(404).json({
        error: { code: 'COLLEGE_NOT_FOUND', message: 'College record not found' },
      });
    }

    if (college.verificationStatus === 'VERIFIED') {
      return res.status(400).json({
        error: { code: 'ALREADY_VERIFIED', message: 'This institution has already been verified.' },
      });
    }

    const claim = new InstitutionClaim({
      collegeSlug: college.slug,
      collegeName: college.name,
      representativeName: representativeName.trim(),
      email: cleanEmail,
      verificationCode: verificationCode.trim(),
      status: 'PENDING',
    });

    await claim.save();

    const adminReviewUrl = `/admin/dashboard?claimId=${claim._id.toString()}`;

    // Notify all admin users
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        const notif = new Notification({
          userId: admin._id.toString(),
          title: 'New Institution Claim Request',
          message: `${representativeName} requested institutional onboarding for "${college.name}" (${college.officialDomain}).`,
          type: 'alert',
          link: adminReviewUrl,
        });
        await notif.save();
        emitToUser(admin._id.toString(), 'notification:new', notif);
      }
    } catch (notifErr: any) {
      console.warn('[Institution Claim] Failed to broadcast admin notifications:', notifErr.message);
    }

    await recordAuditLog({
      req,
      action: 'INSTITUTION_CLAIM_REQUESTED',
      entity: 'InstitutionClaim',
      entityId: claim._id.toString(),
      status: 'SUCCESS',
      details: { collegeSlug: college.slug, representativeName, email: cleanEmail },
    });

    res.status(201).json({
      data: {
        requestId: claim._id.toString(),
        adminReviewUrl,
        status: 'PENDING',
        message: 'Institution onboarding claim submitted successfully. Platform administrators will review the verification code.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * GET /api/admin/institution-claims
 * Output: [{ id, college, representative, status }]
 */
export const getAdminInstitutionClaims = async (_req: Request, res: Response) => {
  try {
    const claims = await InstitutionClaim.find().sort({ createdAt: -1 }).lean();
    const formatted = claims.map((c: any) => ({
      id: c._id.toString(),
      college: c.collegeName,
      collegeSlug: c.collegeSlug,
      representative: c.representativeName,
      email: c.email,
      verificationCode: c.verificationCode,
      status: c.status,
      createdAt: c.createdAt,
    }));

    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * POST /api/admin/institution-claims/:id/approve
 * Logic: Set college.verificationStatus = VERIFIED
 */
export const approveInstitutionClaim = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Claim request not found' } });
    }

    const claim = await InstitutionClaim.findById(id);
    if (!claim) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Claim request not found' } });
    }

    claim.status = 'APPROVED';
    await claim.save();

    // Set college verificationStatus to VERIFIED
    const college = await College.findOneAndUpdate(
      { slug: claim.collegeSlug },
      { verificationStatus: 'VERIFIED' },
      { new: true }
    );

    await recordAuditLog({
      req,
      action: 'INSTITUTION_CLAIM_APPROVED',
      entity: 'InstitutionClaim',
      entityId: claim._id.toString(),
      status: 'SUCCESS',
      details: { collegeSlug: claim.collegeSlug, collegeName: claim.collegeName },
    });

    res.json({
      data: {
        success: true,
        claimId: claim._id.toString(),
        college: college ? college.name : claim.collegeName,
        verificationStatus: 'VERIFIED',
        message: `Institution claim approved. ${claim.collegeName} is now VERIFIED.`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Opportunity } from '../models/Opportunity';
import { Application } from '../models/Application';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { emitToUser, emitBroadcast } from '../services/socketService';
import { calculateCandidateOpportunityMatch } from '../services/matchingService';
import { recordOpportunityBenchmark } from '../services/benchmarkService';
import { dispatchNotification } from '../services/notificationService';

export const getAllInternships = async (req: Request, res: Response) => {
  try {
    const { domain, search, status, postedBy } = req.query;
    const query: any = { type: 'internship' };

    if (status) {
      query.status = status;
    } else {
      query.status = 'active';
    }

    if (postedBy) {
      query.postedBy = postedBy;
    }

    if (domain && domain !== 'All') {
      query.ayushDomain = domain;
    }

    if (search) {
      const q = search.toString().trim();
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escapedQ, $options: 'i' } },
        { company: { $regex: escapedQ, $options: 'i' } },
        { skillsRequired: { $in: [new RegExp(escapedQ, 'i')] } },
      ];
    }

    const internships = await Opportunity.find(query).sort({ createdAt: -1 }).lean();
    const formatted = internships.map((item: any) => ({
      ...item,
      id: item._id.toString(),
    }));
    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getInternshipById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    }

    const internship = await Opportunity.findById(id).lean();
    if (!internship) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    }

    const formatted = {
      ...internship,
      id: internship._id.toString(),
    };

    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createInternship = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const user = (req as any).user;
    const postedBy = (user?.role === 'admin' && payload.postedBy) ? payload.postedBy : user?._id;

    const newInternship = new Opportunity({
      ...payload,
      type: 'internship',
      status: 'active',
      postedBy: postedBy || undefined,
      postedDate: new Date().toISOString().split('T')[0],
    });

    await newInternship.save();

    // Dynamically record/update industry skill benchmarks from this posting
    if (Array.isArray(payload.skillRequirements)) {
      for (const sr of payload.skillRequirements) {
        if (sr && sr.name && typeof sr.requiredLevel === 'number') {
          await recordOpportunityBenchmark(
            sr.name,
            sr.requiredLevel,
            newInternship._id.toString(),
            newInternship.ayushDomain
          );
        }
      }
    }

    // Broadcast new opportunity to students via Socket.IO
    emitBroadcast('opportunity:new', {
      type: 'internship',
      title: newInternship.title,
      company: newInternship.company,
    });

    const formatted = {
      ...newInternship.toObject(),
      id: newInternship._id.toString(),
    };

    res.status(201).json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const applyInternship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, studentName, studentEmail, coverNote } = req.body;

    // OWASP A01: Enforce that application is bound to the authenticated user (prevent identity spoofing)
    const authUser = (req as any).user;
    const effectiveUserId = (authUser?.role === 'admin' && userId) ? userId : authUser?._id?.toString();

    if (!effectiveUserId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required to apply' } });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Internship not found' } });
    }

    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      return res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Internship not found' } });
    }

    // Check for existing application
    const existing = await Application.findOne({ userId: effectiveUserId, opportunityId: opportunity._id.toString() });
    if (existing) {
      const formattedExisting = {
        ...existing.toObject(),
        id: existing._id.toString(),
      };
      return res.json({ data: formattedExisting });
    }

    // Fetch real applicant user details
    let realApplicant: any = authUser || null;
    if (!realApplicant && mongoose.isValidObjectId(effectiveUserId)) {
      realApplicant = await User.findById(effectiveUserId).lean();
    }

    // Calculate explainable compatibility match
    const matchResult = await calculateCandidateOpportunityMatch(effectiveUserId, opportunity);

    const application = new Application({
      userId: effectiveUserId,
      employerId: opportunity.postedBy ? opportunity.postedBy.toString() : undefined,
      studentName: realApplicant?.name || studentName || 'Candidate',
      studentEmail: realApplicant?.email || studentEmail || '',
      studentInstitute: realApplicant?.institution || realApplicant?.department || 'Student',
      opportunityId: opportunity._id.toString(),
      type: 'internship',
      opportunityTitle: opportunity.title,
      companyName: opportunity.company,
      status: 'applied',
      appliedDate: new Date().toISOString().split('T')[0],
      coverNote,
      skillMatchPercentage: matchResult.compatibilityScore ?? 0,
    });

    await application.save();

    // Create persistent notification for student
    await dispatchNotification({
      recipientId: effectiveUserId,
      recipientType: 'STUDENT',
      type: 'JOB_APPLICATION_STATUS',
      title: 'Application Submitted',
      message: `Your application for "${opportunity.title}" at ${opportunity.company} was received. Compatibility: ${matchResult.compatibilityScore}%.`,
      link: '/student/applications',
      data: { opportunityId: opportunity._id.toString(), applicationId: application._id.toString() },
      deliveryChannels: ['IN_APP'],
    });

    // Notify the employer if postedBy is set
    if (opportunity.postedBy) {
      await dispatchNotification({
        recipientId: opportunity.postedBy.toString(),
        recipientType: 'COMPANY',
        type: 'JOB_APPLICATION_STATUS',
        title: 'New Candidate Application',
        message: `${application.studentName} applied for "${opportunity.title}".`,
        link: '/industry/applicants',
        data: { opportunityId: opportunity._id.toString(), applicationId: application._id.toString() },
        deliveryChannels: ['IN_APP', 'EMAIL'],
      });
      emitToUser(opportunity.postedBy.toString(), 'application:new', application);
    }

    const formattedApp = {
      ...application.toObject(),
      id: application._id.toString(),
    };

    res.status(201).json({ data: formattedApp });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateInternship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    }

    const opportunity = await Opportunity.findOne({ _id: id, type: 'internship' });
    if (!opportunity) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    }

    const requestingUser = (req as any).user;
    if (requestingUser.role !== 'admin' && opportunity.postedBy?.toString() !== requestingUser._id.toString()) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized to modify this internship' } });
    }

    const allowedUpdates = [
      'title', 'company', 'location', 'isRemote', 'stipend', 'duration',
      'skillsRequired', 'description', 'responsibilities', 'requirements',
      'deadline', 'status', 'ayushDomain', 'openings'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (opportunity as any)[field] = req.body[field];
      }
    });

    await opportunity.save();

    res.json({
      data: {
        ...opportunity.toObject(),
        id: opportunity._id.toString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const deleteInternship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    }

    const opportunity = await Opportunity.findOne({ _id: id, type: 'internship' });
    if (!opportunity) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    }

    const requestingUser = (req as any).user;
    if (requestingUser.role !== 'admin' && opportunity.postedBy?.toString() !== requestingUser._id.toString()) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized to delete this internship' } });
    }

    await Opportunity.findByIdAndDelete(id);
    res.json({ data: { message: 'Internship deleted successfully' } });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Opportunity } from '../models/Opportunity';
import { Application } from '../models/Application';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { emitToUser, emitBroadcast } from '../services/socketService';
import { calculateCandidateOpportunityMatch } from '../services/matchingService';

export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const { domain, search } = req.query;
    const query: any = { type: 'job', status: 'active' };

    if (domain && domain !== 'All') {
      query.ayushDomain = domain;
    }

    if (search) {
      const q = search.toString();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { skillsRequired: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const jobs = await Opportunity.find(query).sort({ createdAt: -1 }).lean();
    const formatted = jobs.map((item: any) => ({
      ...item,
      id: item._id.toString(),
    }));
    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
    }

    const job = await Opportunity.findById(id).lean();
    if (!job) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
    }

    const formatted = {
      ...job,
      id: job._id.toString(),
    };

    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const postedBy = (req as any).user?._id || payload.postedBy;

    const newJob = new Opportunity({
      ...payload,
      type: 'job',
      status: 'active',
      postedBy: postedBy || undefined,
      postedDate: new Date().toISOString().split('T')[0],
    });

    await newJob.save();

    emitBroadcast('opportunity:new', {
      type: 'job',
      title: newJob.title,
      company: newJob.company,
    });

    const formatted = {
      ...newJob.toObject(),
      id: newJob._id.toString(),
    };

    res.status(201).json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const applyJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, studentName, studentEmail, coverNote } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Job not found' } });
    }

    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      return res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Job not found' } });
    }

    const existing = await Application.findOne({ userId, opportunityId: opportunity._id.toString() });
    if (existing) {
      const formattedExisting = {
        ...existing.toObject(),
        id: existing._id.toString(),
      };
      return res.json({ data: formattedExisting });
    }

    // Fetch real applicant user details
    let realApplicant: any = null;
    if (mongoose.isValidObjectId(userId)) {
      realApplicant = await User.findById(userId).lean();
    }
    if (!realApplicant) {
      realApplicant = await User.findOne({ _id: userId }).lean();
    }

    const matchResult = await calculateCandidateOpportunityMatch(userId, opportunity);

    const application = new Application({
      userId,
      employerId: opportunity.postedBy ? opportunity.postedBy.toString() : undefined,
      studentName: realApplicant?.name || studentName || 'Candidate',
      studentEmail: realApplicant?.email || studentEmail || '',
      studentInstitute: realApplicant?.institution || realApplicant?.department || 'Student',
      opportunityId: opportunity._id.toString(),
      type: 'job',
      opportunityTitle: opportunity.title,
      companyName: opportunity.company,
      status: 'applied',
      appliedDate: new Date().toISOString().split('T')[0],
      coverNote,
      skillMatchPercentage: matchResult.compatibilityScore || 85,
    });

    await application.save();

    const notif = new Notification({
      userId,
      title: 'Job Application Received',
      message: `Your application for "${opportunity.title}" at ${opportunity.company} was submitted successfully.`,
      type: 'application',
      link: '/student/applications',
    });
    await notif.save();

    emitToUser(userId, 'notification:new', notif);

    // Notify the employer if postedBy is set
    if (opportunity.postedBy) {
      const employerNotif = new Notification({
        userId: opportunity.postedBy.toString(),
        title: 'New Candidate Application',
        message: `${application.studentName} applied for "${opportunity.title}".`,
        type: 'application',
        link: '/industry/applicants',
      });
      await employerNotif.save();
      emitToUser(opportunity.postedBy.toString(), 'notification:new', employerNotif);
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

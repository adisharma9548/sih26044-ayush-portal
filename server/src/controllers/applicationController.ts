import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Application } from '../models/Application';
import { Opportunity } from '../models/Opportunity';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Meeting } from '../models/Meeting';
import { EndedRoom } from '../models/EndedRoom';
import { emitToUser, markRoomEnded } from '../services/socketService';
import { AuthRequest } from '../middleware/auth';

export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { userId } = req.query;
    // Only admins can view applications belonging to other users; all other users see only their own
    const targetUserId = (user.role === 'admin' && userId) ? userId.toString() : user._id.toString();

    const applications = await Application.find({ userId: targetUserId }).sort({ createdAt: -1 }).lean();
    const formatted = applications.map((item: any) => ({
      ...item,
      id: item._id.toString(),
    }));
    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to retrieve applications' } });
  }
};

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const getCompanyApplicants = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { companyName, employerId } = req.query;
    const isAdmin = user.role === 'admin';

    // OWASP A01 / API1: BOLA check - non-admin industry recruiters cannot query another employer's applicants
    if (!isAdmin && employerId && employerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Unauthorized. You cannot access applicant records for another organization.' }
      });
    }

    const currentUserId = (!isAdmin || !employerId) ? user._id.toString() : employerId.toString();
    const currentCompany = (!isAdmin || !companyName) ? (user.institution || user.name) : companyName.toString();

    const queryConditions: any[] = [];

    if (currentUserId) {
      queryConditions.push({ employerId: currentUserId });
      const userOpportunities = await Opportunity.find({ postedBy: currentUserId }).select('_id').lean();
      if (userOpportunities.length > 0) {
        const oppIds = userOpportunities.map((o: any) => o._id.toString());
        queryConditions.push({ opportunityId: { $in: oppIds } });
      }
    }

    if (currentCompany && currentCompany !== 'undefined' && currentCompany.trim().length > 0) {
      const safeCompanyPattern = escapeRegex(currentCompany.trim());
      queryConditions.push({ companyName: { $regex: safeCompanyPattern, $options: 'i' } });
      const compOpportunities = await Opportunity.find({
        company: { $regex: safeCompanyPattern, $options: 'i' }
      }).select('_id').lean();
      if (compOpportunities.length > 0) {
        const oppIds = compOpportunities.map((o: any) => o._id.toString());
        queryConditions.push({ opportunityId: { $in: oppIds } });
      }
    }

    // Safety guard: If no conditions matched, non-admins must receive empty array (never {} all-docs dump)
    if (queryConditions.length === 0 && !isAdmin) {
      return res.json({ data: [] });
    }

    const query = queryConditions.length > 0 ? { $or: queryConditions } : (isAdmin ? {} : { _id: null });

    const applications = await Application.find(query).sort({ createdAt: -1 }).lean();
    const formatted = applications.map((item: any) => ({
      ...item,
      id: item._id.toString(),
    }));
    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, interviewDate } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const isEmployerMatch = application.employerId === user._id.toString() ||
      (application.companyName && (
        user.institution?.toLowerCase().trim() === application.companyName?.toLowerCase().trim() ||
        user.name?.toLowerCase().trim() === application.companyName?.toLowerCase().trim()
      ));

    if (user.role !== 'admin' && !isEmployerMatch) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not authorized to update this application status' } });
    }

    application.status = status;
    const roomId = `interview-${application._id.toString()}`;

    if (status === 'interview_scheduled') {
      application.interviewDate = interviewDate || new Date(Date.now() + 86400000).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }) + ' IST (Virtual Room)';

      // Resolve student user
      let studentUser = null;
      if (mongoose.isValidObjectId(application.userId)) {
        studentUser = await User.findById(application.userId);
      }
      if (!studentUser && application.studentEmail) {
        studentUser = await User.findOne({ email: application.studentEmail.toLowerCase().trim() });
      }

      // Resolve organizer (employer / recruiter)
      let organizerUser = (req as any).user || null;
      if (!organizerUser && application.employerId && mongoose.isValidObjectId(application.employerId)) {
        organizerUser = await User.findById(application.employerId);
      }
      if (!organizerUser) {
        organizerUser = await User.findOne({ role: 'industry' }) || await User.findOne({ role: 'admin' });
      }

      if (organizerUser) {
        await Meeting.findOneAndUpdate(
          { roomId },
          {
            title: `Technical Interview: ${application.opportunityTitle}`,
            type: 'interview',
            organizerId: organizerUser._id,
            organizerName: organizerUser.name || application.companyName || 'Recruiter Board',
            organizerRole: organizerUser.role || 'industry',
            participantId: studentUser?._id,
            participantEmail: (studentUser?.email || application.studentEmail || 'candidate@ayushportal.gov.in').toLowerCase().trim(),
            participantName: application.studentName || 'Candidate',
            scheduledAt: new Date(Date.now() + 86400000),
            durationMinutes: 45,
            roomId,
            meetingUrl: `/meetings?room=${roomId}`,
            status: 'scheduled',
            notes: `Live technical interview session for ${application.opportunityTitle} at ${application.companyName}. WebRTC native peer-to-peer call.`,
          },
          { upsert: true, new: true }
        );
      }
    } else if (['interview_completed', 'offered', 'rejected', 'withdrawn'].includes(status)) {
      await Meeting.deleteMany({ roomId });
      await EndedRoom.findOneAndUpdate(
        { roomId },
        {
          roomId,
          title: `Technical Interview: ${application.opportunityTitle}`,
          endedBy: user._id.toString(),
          endedAt: new Date(),
          appId: application._id.toString(),
        },
        { upsert: true, new: true }
      );
      markRoomEnded(roomId, user.name);
    }

    await application.save();

    // Create persistent notification for student
    const notifTitle =
      status === 'shortlisted' ? 'Application Shortlisted!' :
      status === 'interview_scheduled' ? 'Technical Interview Scheduled' :
      status === 'offered' ? 'Job Offer Extended!' : 'Application Status Update';

    const notifLink = status === 'interview_scheduled'
      ? `/meetings?room=${roomId}&title=${encodeURIComponent(application.opportunityTitle + ' Interview')}`
      : '/student/applications';

    const notif = new Notification({
      userId: application.userId,
      title: notifTitle,
      message: status === 'interview_scheduled'
        ? `Interview scheduled for "${application.opportunityTitle}" with ${application.companyName}. Click to join your live virtual room.`
        : `Your application for "${application.opportunityTitle}" at ${application.companyName} is now marked as ${status.replace('_', ' ').toUpperCase()}.`,
      type: 'application',
      link: notifLink,
    });
    await notif.save();

    // Emit live event to student via Socket.IO
    emitToUser(application.userId, 'application:status_updated', {
      applicationId: application._id.toString(),
      status: application.status,
      interviewDate: application.interviewDate,
      roomId: status === 'interview_scheduled' ? roomId : undefined,
    });
    emitToUser(application.userId, 'notification:new', notif);

    res.json({ data: application });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

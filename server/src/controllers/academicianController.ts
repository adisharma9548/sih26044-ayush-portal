import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Workshop, Mentorship } from '../models/Workshop';
import { FacultyOpportunity } from '../models/FacultyOpportunity';
import { Notification } from '../models/Notification';
import { Meeting } from '../models/Meeting';
import { emitToUser } from '../services/socketService';
import { recordAuditLog } from '../services/auditService';

export const getFacultyOpportunities = async (_req: Request, res: Response) => {
  try {
    const opps = await FacultyOpportunity.find({ status: 'open' }).sort({ createdAt: -1 });
    res.json({ data: opps });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getWorkshops = async (_req: Request, res: Response) => {
  try {
    const workshops = await Workshop.find({}).sort({ date: 1 }).lean();
    res.json({ data: workshops });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createWorkshop = async (req: Request, res: Response) => {
  try {
    const workshop = new Workshop(req.body);
    await workshop.save();
    res.status(201).json({ data: workshop });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getMentorshipRequests = async (_req: Request, res: Response) => {
  try {
    const requests = await Mentorship.find({}).sort({ createdAt: -1 }).lean();
    res.json({ data: requests });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateMentorshipStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mentorship request not found' } });
    }

    const request = await Mentorship.findById(id);
    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mentorship request not found' } });
    }

    request.status = status;
    const roomId = `mentorship-${request._id.toString()}`;

    if (status === 'accepted') {
      request.meetingLink = `/meetings?room=${roomId}`;

      // Create WebRTC native Meeting record
      await Meeting.findOneAndUpdate(
        { roomId },
        {
          title: `Faculty Mentorship: ${request.topic}`,
          type: 'mentorship',
          organizerId: request.facultyId || (req as any).user?._id,
          organizerName: request.facultyName || 'Faculty Mentor',
          organizerRole: 'academician',
          participantId: request.studentId,
          participantEmail: 'mentee@ayushportal.gov.in',
          participantName: request.studentName,
          scheduledAt: new Date(Date.now() + 86400000),
          durationMinutes: 45,
          roomId,
          meetingUrl: `/meetings?room=${roomId}`,
          status: 'scheduled',
          notes: `Live 1-on-1 mentorship session on ${request.topic}.`,
        },
        { upsert: true, new: true }
      );
    }
    await request.save();

    // Create notification for student
    const notif = new Notification({
      userId: request.studentId,
      title: 'Mentorship Guidance Slot Confirmed',
      message: `${request.facultyName} accepted your guidance request on "${request.topic}". Meeting room is now active.`,
      type: 'mentorship',
      link: `/meetings?room=${roomId}&title=${encodeURIComponent('Mentorship: ' + request.topic)}`,
    });
    await notif.save();

    emitToUser(request.studentId, 'notification:new', notif);

    res.json({ data: request });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

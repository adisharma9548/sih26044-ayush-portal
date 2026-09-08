import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Meeting } from '../models/Meeting';
import { User } from '../models/User';
import { recordAuditLog } from '../services/auditService';

export const scheduleMeeting = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const { title, type, participantEmail, participantName, scheduledAt, durationMinutes, notes } = req.body;

    if (!title || !participantEmail || !scheduledAt) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Title, participant email, and date are required' } });
    }

    const cleanRoomId = `skillbridge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const meetingUrl = `/meetings?room=${cleanRoomId}`;

    const participantUser = await User.findOne({ email: participantEmail.toLowerCase().trim() });

    const meeting = await Meeting.create({
      title,
      type: type || 'interview',
      organizerId: req.user._id,
      organizerName: req.user.name,
      organizerRole: req.user.role,
      participantId: participantUser?._id,
      participantEmail: participantEmail.toLowerCase().trim(),
      participantName: participantName || participantUser?.name || participantEmail,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes || 45,
      roomId: cleanRoomId,
      meetingUrl,
      notes,
      status: 'scheduled',
    });

    await recordAuditLog({
      req,
      action: 'SCHEDULE_MEETING',
      entity: 'Meeting',
      entityId: meeting._id.toString(),
      details: { title, participantEmail, meetingUrl },
    });

    const formatted = {
      ...meeting.toObject(),
      id: meeting._id.toString(),
    };

    res.status(201).json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getMyMeetings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const meetings = await Meeting.find({
      $or: [
        { organizerId: req.user._id },
        { participantId: req.user._id },
        { participantEmail: req.user.email.toLowerCase() },
      ],
    }).sort({ scheduledAt: 1 }).lean();

    const formatted = meetings.map((m: any) => ({
      ...m,
      id: m._id.toString(),
    }));

    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getMeetingById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let meeting = null;

    if (mongoose.isValidObjectId(id)) {
      meeting = await Meeting.findById(id);
    }
    if (!meeting) {
      meeting = await Meeting.findOne({ roomId: id });
    }

    if (!meeting) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
    }
    res.json({ data: meeting });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateMeetingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    let meeting = null;

    if (mongoose.isValidObjectId(id)) {
      meeting = await Meeting.findByIdAndUpdate(id, { status }, { new: true });
    }
    if (!meeting) {
      meeting = await Meeting.findOneAndUpdate({ roomId: id }, { status }, { new: true });
    }

    if (!meeting) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
    }

    res.json({ data: meeting });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

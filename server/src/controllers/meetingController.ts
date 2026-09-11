import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Meeting } from '../models/Meeting';
import { User } from '../models/User';
import { Application } from '../models/Application';
import { Notification } from '../models/Notification';
import { EndedRoom } from '../models/EndedRoom';
import { emitToUser, markRoomEnded } from '../services/socketService';
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

    const cleanRoomId = `nodalconnector-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
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

    // Only return active scheduled/in_progress meetings (exclude completed or cancelled)
    const meetings = await Meeting.find({
      $or: [
        { organizerId: req.user._id },
        { participantId: req.user._id },
        { participantEmail: req.user.email.toLowerCase() },
      ],
      status: { $in: ['scheduled', 'in_progress'] },
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
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { id } = req.params;

    // 1. Check if room is registered as ended in EndedRoom
    const isEnded = await EndedRoom.findOne({ roomId: id });
    if (isEnded) {
      return res.status(410).json({
        error: {
          code: 'MEETING_ENDED',
          message: 'This meeting session has ended and is no longer accessible. New participants cannot join.',
        },
      });
    }

    // 2. If it is an interview room, check if the student application has already completed
    if (id && id.startsWith('interview-')) {
      const appId = id.replace('interview-', '');
      if (mongoose.isValidObjectId(appId)) {
        const app = await Application.findById(appId);
        if (app && (app.status === 'interview_completed' || app.status === 'offered' || app.status === 'rejected')) {
          return res.status(410).json({
            error: {
              code: 'MEETING_ENDED',
              message: 'This technical interview has concluded and the candidate application is under recruiter evaluation.',
            },
          });
        }
      }
    }

    let meeting = null;

    if (mongoose.isValidObjectId(id)) {
      meeting = await Meeting.findById(id);
    }
    if (!meeting) {
      meeting = await Meeting.findOne({ roomId: id });
    }

    if (!meeting) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Meeting not found or has been deleted.' } });
    }

    if (meeting.status === 'completed' || meeting.status === 'cancelled') {
      return res.status(410).json({
        error: {
          code: 'MEETING_ENDED',
          message: 'This meeting session has ended and is no longer accessible.',
        },
      });
    }

    // OWASP A01: Broken Object Level Authorization check
    const isParticipant =
      meeting.organizerId?.toString() === user._id.toString() ||
      meeting.participantId?.toString() === user._id.toString() ||
      meeting.participantEmail?.toLowerCase() === user.email.toLowerCase() ||
      user.role === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied. You are not an authorized participant in this meeting.' } });
    }

    res.json({ data: meeting });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to retrieve meeting' } });
  }
};

export const updateMeetingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { id } = req.params;
    const { status } = req.body;
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

    // OWASP A01: Broken Object Level Authorization check
    const isParticipant =
      meeting.organizerId?.toString() === user._id.toString() ||
      meeting.participantId?.toString() === user._id.toString() ||
      meeting.participantEmail?.toLowerCase() === user.email.toLowerCase() ||
      user.role === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied. You cannot modify a meeting you do not participate in.' } });
    }

    meeting.status = status;
    await meeting.save();

    res.json({ data: meeting });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update meeting status' } });
  }
};

export const endMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { id } = req.params;
    let meeting = null;

    if (mongoose.isValidObjectId(id)) {
      meeting = await Meeting.findById(id);
    }
    if (!meeting) {
      meeting = await Meeting.findOne({ roomId: id });
    }

    const roomId = meeting ? meeting.roomId : id;

    if (meeting) {
      const isParticipant =
        meeting.organizerId?.toString() === user._id.toString() ||
        meeting.participantId?.toString() === user._id.toString() ||
        meeting.participantEmail?.toLowerCase() === user.email.toLowerCase() ||
        user.role === 'admin';

      if (!isParticipant) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied. You are not a participant in this meeting.' } });
      }

      meeting.status = 'completed';
      await meeting.save();
    }

    // Check if this meeting is tied to a student recruitment application (roomId = interview-<appId>)
    let updatedApplication = null;
    let appId: string | null = null;
    if (roomId && roomId.startsWith('interview-')) {
      appId = roomId.replace('interview-', '');
    }

    if (appId && mongoose.isValidObjectId(appId)) {
      const app = await Application.findById(appId);
      if (app) {
        app.status = 'interview_completed';
        await app.save();
        updatedApplication = app;

        // Notify student of interview completion
        emitToUser(app.userId, 'application:status_updated', {
          applicationId: app._id.toString(),
          status: 'interview_completed',
        });

        const notif = new Notification({
          userId: app.userId,
          title: 'Technical Interview Completed',
          message: `Your technical interview for "${app.opportunityTitle}" with ${app.companyName} has concluded. Recruiter evaluation is underway.`,
          type: 'application',
          link: '/student/applications',
        });
        await notif.save();
        emitToUser(app.userId, 'notification:new', notif);
      }
    }

    // Permanently record in EndedRoom so room cannot be re-joined
    if (roomId) {
      await EndedRoom.findOneAndUpdate(
        { roomId },
        {
          roomId,
          title: meeting?.title || (appId ? `Technical Interview (${appId})` : 'Meeting Session'),
          endedBy: user._id.toString(),
          endedAt: new Date(),
          appId: appId || undefined,
        },
        { upsert: true, new: true }
      );
      markRoomEnded(roomId, user.name);
    }

    // Delete meeting from active collection so it disappears from all dashboards
    if (meeting) {
      await Meeting.findByIdAndDelete(meeting._id);
    }
    if (roomId) {
      await Meeting.deleteMany({ roomId });
    }
    await Meeting.deleteMany({ status: { $in: ['completed', 'cancelled'] } });

    await recordAuditLog({
      req,
      action: 'END_MEETING',
      entity: 'Meeting',
      entityId: meeting?._id?.toString() || roomId,
      details: { roomId, appId, applicationStatus: updatedApplication ? 'interview_completed' : undefined },
    });

    res.json({
      success: true,
      message: 'Meeting concluded and permanently removed from active schedules.',
      data: {
        application: updatedApplication,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

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

    const isOrganizer =
      meeting.organizerId?.toString() === user._id.toString() ||
      meeting.participantId?.toString() === user._id.toString() ||
      user.role === 'admin';

    if (!isOrganizer) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the meeting organizer or admin can remove this meeting.' } });
    }

    const roomId = meeting.roomId;
    if (roomId) {
      await EndedRoom.findOneAndUpdate(
        { roomId },
        {
          roomId,
          title: meeting.title,
          endedBy: user._id.toString(),
          endedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      markRoomEnded(roomId, user.name);
      await Meeting.deleteMany({ roomId });
    }
    await Meeting.findByIdAndDelete(meeting._id);

    await recordAuditLog({
      req,
      action: 'DELETE_MEETING',
      entity: 'Meeting',
      entityId: meeting._id.toString(),
      details: { roomId },
    });

    res.json({ success: true, message: 'Meeting successfully deleted from schedule.' });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};


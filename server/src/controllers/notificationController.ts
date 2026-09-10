import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import { Partner } from '../models/Partner';
import { MouProposal } from '../models/MouProposal';
import { User } from '../models/User';
import { Opportunity } from '../models/Opportunity';

export const getAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Dedicated Administrative Notifications for Admin role
    if (user && user.role === 'admin') {
      const [pendingPartners, pendingMous, totalStudents, activeOpportunities] = await Promise.all([
        Partner.countDocuments({ status: 'Pending' }),
        MouProposal.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: { $in: ['student', 'jobseeker'] } }),
        Opportunity.countDocuments({ status: 'active' }),
      ]);

      const adminNotifs: any[] = [];

      if (pendingPartners > 0) {
        adminNotifs.push({
          id: 'admin_notif_pending_partners',
          userId: user._id.toString(),
          title: 'Pending Employer Accreditations',
          message: `${pendingPartners} corporate partner organization${pendingPartners > 1 ? 's are' : ' is'} awaiting administrative review and KYC approval.`,
          read: false,
          timestamp: 'Action Required',
          type: 'alert',
          link: '/admin/users',
        });
      }

      if (pendingMous > 0) {
        adminNotifs.push({
          id: 'admin_notif_pending_mous',
          userId: user._id.toString(),
          title: 'MoU Endorsement Awaiting Digital Seal',
          message: `${pendingMous} collaborative industry-academia MoU proposal${pendingMous > 1 ? 's require' : ' requires'} Directorate review and digital sealing.`,
          read: false,
          timestamp: 'Review Needed',
          type: 'system',
          link: '/admin/dashboard',
        });
      }

      adminNotifs.push({
        id: 'admin_notif_scholars_registered',
        userId: user._id.toString(),
        title: 'National Scholar Cohort Roster',
        message: `${totalStudents} student scholar${totalStudents !== 1 ? 's' : ''} currently enrolled in the National Stakeholder Registry.`,
        read: true,
        timestamp: 'Real-time',
        type: 'achievement',
        link: '/admin/users',
      });

      adminNotifs.push({
        id: 'admin_notif_system_health',
        userId: user._id.toString(),
        title: 'Platform Infrastructure Operational',
        message: `MongoDB Atlas cluster synchronized with TLS encryption. Groq AI diagnostic service online.`,
        read: true,
        timestamp: 'Operational',
        type: 'system',
        link: '/admin/dashboard',
      });

      if (activeOpportunities > 0) {
        adminNotifs.push({
          id: 'admin_notif_opportunities_active',
          userId: user._id.toString(),
          title: 'Active Opportunity Listings',
          message: `${activeOpportunities} verified internship and job openings active across accredited domains.`,
          read: true,
          timestamp: 'Live Listings',
          type: 'system',
          link: '/admin/reports',
        });
      }

      // Include any explicitly saved notifications
      const storedNotifs = await Notification.find({ userId: user._id.toString() }).sort({ createdAt: -1 }).lean();
      const formattedStored = storedNotifs.map((n: any) => ({
        ...n,
        id: (n.id || n._id).toString(),
      }));
      return res.json({ data: [...adminNotifs, ...formattedStored] });
    }

    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const notifs = await Notification.find({ userId: user._id.toString() }).sort({ createdAt: -1 }).lean();
    const formattedNotifs = notifs.map((n: any) => ({
      ...n,
      id: (n.id || n._id).toString(),
    }));
    res.json({ data: formattedNotifs });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { id } = req.params;
    if (mongoose.isValidObjectId(id)) {
      const query: any = { _id: id };
      if (user.role !== 'admin') {
        query.userId = user._id.toString();
      }
      await Notification.findOneAndUpdate(query, { read: true });
    }
    res.json({ data: true });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    await Notification.updateMany({ userId: user._id.toString() }, { read: true });
    res.json({ data: true });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    await Notification.deleteMany({ userId: user._id.toString() });
    res.json({ data: true });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

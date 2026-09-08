import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Opportunity } from '../models/Opportunity';
import { Partner } from '../models/Partner';
import { Application } from '../models/Application';
import { SkillProfile } from '../models/SkillProfile';
import { AssessmentAttempt } from '../models/Assessment';
import { recordAuditLog } from '../services/auditService';

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalStudents,
      activePartners,
      totalInternshipsPosted,
      totalJobsPosted,
      totalApplications,
      offeredApplications,
      avgSkillScoreDoc,
      pendingPartners
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ['student', 'jobseeker'] } }),
      Partner.countDocuments({ status: 'Approved' }),
      Opportunity.countDocuments({ type: 'internship' }),
      Opportunity.countDocuments({ type: 'job' }),
      Application.countDocuments({}),
      Application.countDocuments({ status: { $in: ['offered', 'shortlisted', 'accepted'] } }),
      SkillProfile.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
      ]),
      Partner.countDocuments({ status: 'Pending' }),
    ]);

    const placementRateCalc = totalApplications > 0
      ? `${Math.round((offeredApplications / totalApplications) * 100)}%`
      : '0%';

    const calculatedAvgSkill = avgSkillScoreDoc.length > 0 && avgSkillScoreDoc[0].avgScore
      ? Math.round(avgSkillScoreDoc[0].avgScore * 10) / 10
      : 0;

    res.json({
      data: {
        totalStudents,
        activePartners,
        totalInternshipsPosted,
        totalJobsPosted,
        internshipsFilled: offeredApplications,
        overallPlacementRate: placementRateCalc,
        avgSkillIndex: calculatedAvgSkill,
        pendingVerifications: pendingPartners,
        mouSignedCount: activePartners,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getPartners = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query = (user && user.role === 'admin') ? {} : { status: 'Approved' };
    const partners = await Partner.find(query).sort({ createdAt: -1 }).lean();
    res.json({ data: partners });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to retrieve partners' } });
  }
};

export const approvePartner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Partner not found' } });
    }

    const partner = await Partner.findByIdAndUpdate(id, { status: 'Approved' }, { new: true });
    if (!partner) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Partner not found' } });
    }

    await recordAuditLog({
      req,
      action: 'APPROVE_PARTNER',
      entity: 'Partner',
      entityId: id,
      details: { name: partner?.name, status: 'Approved' },
    });

    res.json({ data: true });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const blockPartner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Partner not found' } });
    }

    const partner = await Partner.findByIdAndUpdate(id, { status: 'Blocked' }, { new: true });
    if (!partner) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Partner not found' } });
    }

    await recordAuditLog({
      req,
      action: 'BLOCK_PARTNER',
      entity: 'Partner',
      entityId: id,
      details: { name: partner?.name, status: 'Blocked' },
    });

    res.json({ data: true });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getProgressAnalytics = async (_req: Request, res: Response) => {
  try {
    // 1. Real Department averages from MongoDB Users and SkillProfiles
    const deptAgg = await User.aggregate([
      { $match: { role: 'student', department: { $exists: true, $ne: '' } } },
      {
        $lookup: {
          from: 'skillprofiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      {
        $group: {
          _id: '$department',
          students: { $sum: 1 },
          avgScore: {
            $avg: {
              $cond: [
                { $gt: [{ $size: '$profile' }, 0] },
                { $arrayElemAt: ['$profile.overallScore', 0] },
                null,
              ],
            },
          },
        },
      },
      { $sort: { students: -1 } },
    ]);

    const departmentAverages = deptAgg.length > 0
      ? deptAgg.map((d) => ({
          department: d._id,
          score: d.avgScore ? Math.round(d.avgScore) : 0,
          students: d.students,
        }))
      : [];

    // 2. Identify actual students with high priority skill gaps (< 60% overall score)
    const gapProfiles = await SkillProfile.find({ overallScore: { $gt: 0, $lt: 60 } })
      .limit(10)
      .lean();

    const userIds = gapProfiles.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const atRiskStudents = gapProfiles.map((p: any) => {
      const user = userMap.get(p.userId);
      const topGap = p.gapAnalysis?.[0];
      return {
        name: user?.name || 'Student Scholar',
        institute: user?.institution || user?.department || 'Affiliated Institution',
        score: p.overallScore || 0,
        gap: topGap ? `${topGap.skill} (${topGap.gapPercentage}% gap)` : 'Competency Benchmark Gap',
        status: (topGap?.gapPercentage || 0) > 20 ? 'Intervention Required' : 'Bridge Recommended',
      };
    });

    // 3. Real monthly skill score trends from AssessmentAttempt
    const monthlyAttempts = await AssessmentAttempt.aggregate([
      {
        $group: {
          _id: { $month: '$evaluatedAt' },
          avgScore: { $avg: '$score' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const skillTrend = monthlyAttempts.map((m) => ({
      month: monthNames[m._id] || `M${m._id}`,
      index: Math.round(m.avgScore),
    }));

    res.json({
      data: {
        departmentAverages,
        skillTrend,
        atRiskStudents,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getReportsAnalytics = async (_req: Request, res: Response) => {
  try {
    const totalOpportunities = await Opportunity.countDocuments({ status: 'active' });

    const domainAgg = await Opportunity.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$ayushDomain',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const domainDemand = domainAgg.map((d) => ({
      name: d._id || 'General Technology',
      count: d.count,
      share: totalOpportunities > 0 ? `${Math.round((d.count / totalOpportunities) * 100)}%` : '0%',
    }));

    const skillsAgg = await Opportunity.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$skillsRequired' },
      {
        $group: {
          _id: '$skillsRequired',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    const topSkillsDemand = skillsAgg.map((s) => ({
      skill: s._id,
      count: s.count,
      demand: totalOpportunities > 0 ? `${Math.round((s.count / totalOpportunities) * 100)}%` : '0%',
      growth: 'Active Demand',
    }));

    res.json({
      data: {
        totalOpportunities,
        domainDemand,
        topSkillsDemand,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getStudents = async (_req: Request, res: Response) => {
  try {
    const students = await User.find({ role: { $in: ['student', 'jobseeker'] } })
      .select('name email role institution department degree location verified createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: students });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

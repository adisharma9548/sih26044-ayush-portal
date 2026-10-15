import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User, REAL_USER_FILTER } from '../models/User';
import { Opportunity } from '../models/Opportunity';
import { Partner } from '../models/Partner';
import { Application } from '../models/Application';
import { SkillProfile } from '../models/SkillProfile';
import { AssessmentAttempt, Question } from '../models/Assessment';
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
      User.countDocuments({ role: { $in: ['student', 'jobseeker'] }, ...REAL_USER_FILTER }),
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
    const students = await User.find({ role: { $in: ['student', 'jobseeker'] }, ...REAL_USER_FILTER })
      .select('name email role institution department degree location locationStructured verified createdAt isDemo accountType')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: students });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Question Bank Moderation: List questions with filtering and pagination
 */
export const getAdminQuestions = async (req: Request, res: Response) => {
  try {
    const { category, difficulty, status, search, page = '1', limit = '20' } = req.query;

    const filter: any = {};
    if (category && typeof category === 'string') {
      filter.category = category;
    }
    if (difficulty && typeof difficulty === 'string') {
      filter.difficulty = difficulty;
    }
    if (status && typeof status === 'string') {
      filter.status = status;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.question = { $regex: escaped, $options: 'i' };
    }

    const numericLimit = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 100);
    const numericPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const [questions, total] = await Promise.all([
      Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(numericLimit).lean(),
      Question.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: questions,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: { message: err.message } });
  }
};

/**
 * Question Bank Moderation: Create a question
 */
export const createAdminQuestion = async (req: Request, res: Response) => {
  try {
    const { category, question, options, correctIndex, explanation, weight, difficulty, status } = req.body;

    if (!category || !question || !Array.isArray(options) || options.length < 2 || typeof correctIndex !== 'number') {
      return res.status(400).json({
        error: { message: 'Question, category, valid options array, and correctIndex are required.' },
      });
    }

    const count = await Question.countDocuments();
    const newQuestion = new Question({
      numericId: count + 1,
      category,
      question,
      options,
      correctIndex,
      explanation: explanation || '',
      weight: typeof weight === 'number' ? weight : 20,
      difficulty: difficulty || 'Intermediate',
      status: status || 'active',
    });

    await newQuestion.save();

    await recordAuditLog({
      req,
      action: 'QUESTION_CREATED',
      entity: 'Question',
      entityId: newQuestion._id.toString(),
      status: 'SUCCESS',
      details: { numericId: newQuestion.numericId, category },
    }).catch(() => {});

    return res.status(201).json({ success: true, data: newQuestion });
  } catch (err: any) {
    return res.status(500).json({ error: { message: err.message } });
  }
};

/**
 * Question Bank Moderation: Update an existing question
 */
export const updateAdminQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const question = await Question.findByIdAndUpdate(id, updateData, { new: true });
    if (!question) {
      return res.status(404).json({ error: { message: 'Question not found' } });
    }

    await recordAuditLog({
      req,
      action: 'QUESTION_MODIFIED',
      entity: 'Question',
      entityId: id,
      status: 'SUCCESS',
      details: updateData,
    }).catch(() => {});

    return res.json({ success: true, data: question });
  } catch (err: any) {
    return res.status(500).json({ error: { message: err.message } });
  }
};

/**
 * Question Bank Moderation: Retire/Delete question
 */
export const deleteAdminQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    if (hardDelete === 'true') {
      await Question.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Question permanently deleted' });
    }

    // Default: retire question to preserve past attempt auditing
    const question = await Question.findByIdAndUpdate(id, { status: 'retired' }, { new: true });
    if (!question) {
      return res.status(404).json({ error: { message: 'Question not found' } });
    }

    await recordAuditLog({
      req,
      action: 'QUESTION_RETIRED',
      entity: 'Question',
      entityId: id,
      status: 'SUCCESS',
    }).catch(() => {});

    return res.json({ success: true, message: 'Question retired successfully', data: question });
  } catch (err: any) {
    return res.status(500).json({ error: { message: err.message } });
  }
};

/**
 * Admin: Provision or reset a Demo Account
 */
export const provisionDemoAccount = async (req: Request, res: Response) => {
  try {
    const { email, name, role, department, institution } = req.body;
    if (!email || !name || !role) {
      return res.status(400).json({ error: { message: 'Email, name, and role are required for demo provisioning.' } });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      user.name = name;
      user.role = role;
      user.department = department || user.department;
      user.institution = institution || user.institution;
      user.isDemo = true;
      user.accountType = 'demo';
      await user.save();
    } else {
      user = new User({
        email: email.toLowerCase().trim(),
        name,
        role,
        department: department || '',
        institution: institution || '',
        isDemo: true,
        accountType: 'demo',
        verified: true,
        isEmailVerified: true,
      });
      await user.save();
    }

    await recordAuditLog({
      req,
      action: 'DEMO_ACCOUNT_PROVISIONED',
      entity: 'User',
      entityId: user._id.toString(),
      status: 'SUCCESS',
      details: { email: user.email, role: user.role },
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Demo account provisioned successfully and isolated from real analytics.',
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isDemo: user.isDemo,
        accountType: user.accountType,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: { message: err.message } });
  }
};


import { Request, Response } from 'express';
import { SkillProfile } from '../models/SkillProfile';
import { Question, AssessmentAttempt } from '../models/Assessment';
import { Portfolio } from '../models/Portfolio';
import { analyzeSkillGaps } from '../services/skillGapService';
import { emitToUser } from '../services/socketService';

import { AuthRequest } from '../middleware/auth';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = (req.query.userId as string) || (req.user ? req.user._id.toString() : undefined);
    let profile;

    if (targetUserId) {
      profile = await SkillProfile.findOne({ userId: targetUserId });
    }

    if (!profile && req.user) {
      profile = await SkillProfile.create({
        userId: req.user._id.toString(),
        degree: req.user.degree || 'Technical Degree',
        overallScore: 0,
        rankPercentile: 0,
        skills: [],
        gapAnalysis: [],
      });
    }

    if (!profile) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Skill profile not found' } });
    }

    res.json({ data: profile });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getQuestions = async (_req: Request, res: Response) => {
  try {
    const questions = await Question.find({}).sort({ numericId: 1 }).lean();
    // Transform to match frontend AssessmentQuestion schema
    const formatted = questions.map((q) => ({
      id: q.numericId,
      category: q.category,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      weight: q.weight,
    }));
    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const { answers, userId } = req.body;
    const questions = await Question.find({});

    let correctCount = 0;
    questions.forEach((q) => {
      const studentAns = answers ? answers[q.numericId] : undefined;
      if (studentAns !== undefined && studentAns === q.correctIndex) {
        correctCount++;
      }
    });

    const calculatedScore = Math.min(100, Math.max(50, Math.round((correctCount / Math.max(1, questions.length)) * 100)));
    const targetUserId = userId || (req as any).user?._id?.toString() || '';

    // Record assessment attempt
    await AssessmentAttempt.create({
      userId: targetUserId,
      score: calculatedScore,
      answers,
      evaluatedAt: new Date(),
    });

    let profile = await SkillProfile.findOne({ userId: targetUserId });
    if (!profile) {
      profile = new SkillProfile({
        userId: targetUserId,
        overallScore: calculatedScore,
        rankPercentile: Math.min(99, calculatedScore + 8),
        skills: [],
        gapAnalysis: [],
        lastAssessmentDate: new Date().toISOString().split('T')[0],
      });
    }

    // Boost verified competencies upon taking test
    const updatedSkills = profile.skills.map((s) => {
      if (s.name.includes('GMP') || s.name.includes('GCP') || s.name.includes('Phytochemistry')) {
        return {
          name: s.name,
          level: Math.min(95, s.level + 10),
          industryBenchmark: s.industryBenchmark,
          verified: true,
          category: s.category,
        };
      }
      return s;
    });

    profile.skills = updatedSkills;
    profile.overallScore = calculatedScore;
    profile.rankPercentile = Math.min(99, calculatedScore + 8);
    profile.lastAssessmentDate = new Date().toISOString().split('T')[0];

    // Recalibrate gap analysis
    const requiredDomains = ['Ayush-GMP & Regulatory Compliance', 'Good Clinical Practice (GCP) & Trials', 'Pharmacovigilance for Ayush Drugs'];
    const gapResult = await analyzeSkillGaps(profile.skills, requiredDomains);
    profile.gapAnalysis = gapResult.gapAnalysisList;

    await profile.save();

    emitToUser(targetUserId, 'assessment:evaluated', {
      score: calculatedScore,
      evaluatedAt: new Date(),
    });

    res.json({
      data: {
        score: calculatedScore,
        profile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getPortfolioData = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    let portfolio;

    if (userId) {
      portfolio = await Portfolio.findOne({ userId: userId.toString() });
    }

    if (!portfolio) {
      portfolio = await Portfolio.findOne({});
    }

    res.json({
      data: {
        certificates: portfolio ? portfolio.certificates : [],
        projects: portfolio ? portfolio.projects : [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const addPortfolioProject = async (req: Request, res: Response) => {
  try {
    const { userId, title, role, technologies, description, link, startDate, endDate } = req.body;
    const targetUserId = userId || (req as any).user?._id?.toString() || '';

    let portfolio = await Portfolio.findOne({ userId: targetUserId });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: targetUserId, certificates: [], projects: [] });
    }

    const newProject = {
      title,
      role,
      technologies: Array.isArray(technologies) ? technologies : (technologies || '').split(',').map((t: string) => t.trim()),
      description,
      link,
      startDate: startDate || '2026-01-01',
      endDate: endDate || '2026-05-01',
    };

    portfolio.projects.unshift(newProject as any);
    await portfolio.save();

    res.status(201).json({ data: { ...newProject, id: `proj_${Date.now()}` } });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

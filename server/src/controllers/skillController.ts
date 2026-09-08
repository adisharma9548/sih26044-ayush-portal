import { Request, Response } from 'express';
import { SkillProfile } from '../models/SkillProfile';
import { Question, AssessmentAttempt } from '../models/Assessment';
import { Portfolio } from '../models/Portfolio';
import { analyzeSkillGaps } from '../services/skillGapService';
import { generateDiagnosticQuestions } from '../services/aiService';
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

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const degree = (req.query.degree as string) || (req as any).user?.degree || '';
    const specialization =
      (req.query.specialization as string) ||
      (req.query.category as string) ||
      (req as any).user?.specialization ||
      (req as any).user?.currentDomain ||
      '';

    const aiQuestions = await generateDiagnosticQuestions(degree, specialization, undefined, specialization);
    const formatted = aiQuestions.map((q) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      weight: Math.round(100 / aiQuestions.length),
    }));
    return res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const { answers, userId, proctoring, questions: clientQuestions } = req.body;

    let correctCount = 0;
    let totalQuestionsCount = 0;

    if (Array.isArray(clientQuestions) && clientQuestions.length > 0) {
      totalQuestionsCount = clientQuestions.length;
      clientQuestions.forEach((q: any) => {
        const studentAns = answers ? answers[q.id] : undefined;
        if (studentAns !== undefined && studentAns === q.correctIndex) {
          correctCount++;
        }
      });
    } else {
      const questions = await Question.find({});
      totalQuestionsCount = Math.max(1, questions.length);
      questions.forEach((q) => {
        const studentAns = answers ? answers[q.numericId] : undefined;
        if (studentAns !== undefined && studentAns === q.correctIndex) {
          correctCount++;
        }
      });
    }

    const calculatedScore = Math.min(
      100,
      Math.max(0, Math.round((correctCount / Math.max(1, totalQuestionsCount)) * 100))
    );
    const targetUserId = userId || (req as any).user?._id?.toString() || '';

    // Record assessment attempt with proctoring audit metadata
    await AssessmentAttempt.create({
      userId: targetUserId,
      score: calculatedScore,
      answers,
      evaluatedAt: new Date(),
      proctoring: proctoring
        ? {
            violationsCount: proctoring.violationsCount || 0,
            violationsLog: proctoring.violationsLog || [],
            terminatedEarly: !!proctoring.terminatedEarly,
            integrityScore: typeof proctoring.integrityScore === 'number' ? proctoring.integrityScore : 100,
          }
        : undefined,
    });

    const totalAttempts = await AssessmentAttempt.countDocuments();
    const lowerScores = await AssessmentAttempt.countDocuments({ score: { $lt: calculatedScore } });
    const rankPercentile = totalAttempts > 0 ? Math.round((lowerScores / totalAttempts) * 100) : calculatedScore;

    let profile = await SkillProfile.findOne({ userId: targetUserId });
    if (!profile) {
      profile = new SkillProfile({
        userId: targetUserId,
        overallScore: calculatedScore,
        rankPercentile,
        skills: [],
        gapAnalysis: [],
        lastAssessmentDate: new Date().toISOString().split('T')[0],
      });
    }

    // Update verified competencies upon taking test
    const updatedSkills = profile.skills.map((s) => {
      if (s.name.includes('GMP') || s.name.includes('GCP') || s.name.includes('Phytochemistry')) {
        return {
          name: s.name,
          level: Math.max(s.level, calculatedScore),
          industryBenchmark: s.industryBenchmark,
          verified: calculatedScore >= 60,
          category: s.category,
        };
      }
      return s;
    });

    profile.skills = updatedSkills;
    profile.overallScore = calculatedScore;
    profile.rankPercentile = rankPercentile;
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
    const requestingUser = (req as any).user;
    const { userId } = req.query;
    const targetUserId = userId?.toString() || requestingUser?._id?.toString();

    if (!targetUserId) {
      return res.json({
        data: {
          certificates: [],
          projects: [],
        },
      });
    }

    const portfolio = await Portfolio.findOne({ userId: targetUserId });

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

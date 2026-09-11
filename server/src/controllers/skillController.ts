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

    // Persist verified questions to database so evaluation verifies against server authority
    for (const q of aiQuestions) {
      await Question.findOneAndUpdate(
        { question: q.question },
        {
          numericId: q.id,
          category: q.category,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        },
        { upsert: true, new: true }
      ).catch(() => {});
    }

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
    const authUser = (req as any).user;
    if (!authUser) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { answers, userId, proctoring, questions: clientQuestions } = req.body;
    // OWASP A01 / API1: Strictly bind targetUserId to authenticated user unless caller is admin
    const targetUserId = (authUser.role === 'admin' && userId) ? userId : authUser._id.toString();

    let correctCount = 0;
    let totalQuestionsCount = 0;

    const categoryScores = new Map<string, { correct: number; total: number }>();

    if (Array.isArray(clientQuestions) && clientQuestions.length > 0) {
      totalQuestionsCount = clientQuestions.length;
      // Fetch verified questions from database to prevent client tampering of correctIndex
      const questionTexts = clientQuestions.map((q: any) => q.question).filter(Boolean);
      const dbQuestions = await Question.find({ question: { $in: questionTexts } }).lean();
      const dbQuestionMap = new Map(dbQuestions.map((dq) => [dq.question, dq]));

      clientQuestions.forEach((q: any) => {
        const cat = q.category || authUser.specialization || 'Core Competency';
        if (!categoryScores.has(cat)) {
          categoryScores.set(cat, { correct: 0, total: 0 });
        }
        const stat = categoryScores.get(cat)!;
        stat.total++;

        const studentAns = answers ? answers[q.id] : undefined;
        const verifiedRecord = dbQuestionMap.get(q.question);
        // Server authority: Always use verified server correctIndex if available
        const actualCorrect = verifiedRecord ? verifiedRecord.correctIndex : q.correctIndex;
        if (studentAns !== undefined && studentAns === actualCorrect) {
          correctCount++;
          stat.correct++;
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

    // Sanitize answers map to plain object
    const sanitizedAnswers: Record<string, number> = {};
    if (answers && typeof answers === 'object') {
      for (const [k, v] of Object.entries(answers)) {
        if (typeof v === 'number') {
          sanitizedAnswers[k] = v;
        }
      }
    }

    // Record assessment attempt with proctoring audit metadata (resilient)
    try {
      await AssessmentAttempt.create({
        userId: targetUserId,
        score: calculatedScore,
        answers: sanitizedAnswers,
        evaluatedAt: new Date(),
        proctoring: proctoring
          ? {
              violationsCount: proctoring.violationsCount || 0,
              violationsLog: Array.isArray(proctoring.violationsLog) ? proctoring.violationsLog : [],
              terminatedEarly: !!proctoring.terminatedEarly,
              integrityScore: typeof proctoring.integrityScore === 'number' ? proctoring.integrityScore : 100,
            }
          : undefined,
      });
    } catch (attemptErr: any) {
      console.warn('[submitAssessment] Non-fatal attempt logging warning:', attemptErr.message);
    }

    const totalAttempts = await AssessmentAttempt.countDocuments();
    const lowerScores = await AssessmentAttempt.countDocuments({ score: { $lt: calculatedScore } });
    const rankPercentile = totalAttempts > 0 ? Math.round((lowerScores / totalAttempts) * 100) : calculatedScore;

    let profile = await SkillProfile.findOne({ userId: targetUserId });
    if (!profile) {
      profile = new SkillProfile({
        userId: targetUserId,
        degree: authUser.degree || '',
        overallScore: calculatedScore,
        rankPercentile,
        skills: [],
        gapAnalysis: [],
        lastAssessmentDate: new Date().toISOString().split('T')[0],
      });
    }

    if (!Array.isArray(profile.skills)) {
      profile.skills = [];
    }

    // Update existing skills or append newly tested categories
    const existingSkillsMap = new Map(profile.skills.map((s) => [s.name.toLowerCase(), s]));
    categoryScores.forEach((stats, catName) => {
      const catScore = Math.round((stats.correct / Math.max(1, stats.total)) * 100);
      const existing = existingSkillsMap.get(catName.toLowerCase());
      if (existing) {
        existing.level = Math.max(existing.level || 0, catScore);
        existing.verified = existing.level >= 60;
      } else {
        profile.skills.push({
          name: catName,
          level: catScore,
          industryBenchmark: 75,
          verified: catScore >= 60,
          category: 'Assessment Verified',
        } as any);
      }
    });

    // Also update legacy Ayush skills if present
    profile.skills.forEach((s) => {
      if (s?.name && (s.name.includes('GMP') || s.name.includes('GCP') || s.name.includes('Phytochemistry'))) {
        s.level = Math.max(s.level || 0, calculatedScore);
        s.verified = calculatedScore >= 60;
      }
    });

    profile.overallScore = calculatedScore;
    profile.rankPercentile = rankPercentile;
    profile.lastAssessmentDate = new Date().toISOString().split('T')[0];

    // Recalibrate gap analysis safely
    try {
      const requiredDomains = Array.from(categoryScores.keys()).length > 0
        ? Array.from(categoryScores.keys())
        : ['Ayush-GMP & Regulatory Compliance', 'Good Clinical Practice (GCP) & Trials', 'Pharmacovigilance for Ayush Drugs'];
      const gapResult = await analyzeSkillGaps(profile.skills, requiredDomains);
      profile.gapAnalysis = gapResult.gapAnalysisList;
    } catch (gapErr: any) {
      console.warn('[submitAssessment] Gap analysis warning:', gapErr.message);
    }

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
    console.error('[submitAssessment] Error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getPortfolioData = async (req: Request, res: Response) => {
  try {
    const requestingUser = (req as any).user;
    const { userId } = req.query;
    const isElevated = requestingUser?.role === 'admin' || requestingUser?.role === 'academician' || requestingUser?.role === 'industry';
    const targetUserId = (isElevated && userId) ? userId.toString() : requestingUser?._id?.toString();

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
    const requestingUser = (req as any).user;
    if (!requestingUser) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { userId, title, role, technologies, description, link, startDate, endDate } = req.body;
    // OWASP A01 / API1: Strictly scope portfolio modifications to authenticated owner unless admin
    const targetUserId = (requestingUser.role === 'admin' && userId) ? userId : requestingUser._id.toString();

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

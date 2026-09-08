import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import { generateDiagnosticQuestions, evaluateDiagnosticAnswers, generateStudyTimeline } from '../services/aiService';
import { searchRoadmapsForLaggingSkills } from '../services/roadmapService';
import { SkillProfile } from '../models/SkillProfile';
import { User } from '../models/User';
import { recordAuditLog } from '../services/auditService';

export const getDiagnosticQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const degree = (req.query.degree as string) || req.user?.degree || 'B.Tech Computer Science & Engineering';
    const domain = (req.query.domain as string) || req.user?.currentDomain || req.query.specialization as string || '';
    const targetDomain = (req.query.targetDomain as string) || req.user?.targetDomain || '';

    // If user is authenticated and provided domains, persist them
    if (req.user && (domain || targetDomain)) {
      if (domain) req.user.currentDomain = domain;
      if (targetDomain) req.user.targetDomain = targetDomain;
      await req.user.save();
    }

    const questions = await generateDiagnosticQuestions(degree, domain, targetDomain);

    res.json({
      data: {
        degree,
        domain,
        targetDomain,
        questions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_DIAGNOSTIC_ERROR', message: err.message } });
  }
};

export const getStudyTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const { domain, targetDomain, failedQuestions, correctCount, totalAnswered } = req.body;
    const activeDomain = domain || req.user?.currentDomain || req.user?.degree || 'Computer Science & Engineering';
    const activeTarget = targetDomain || req.user?.targetDomain || 'Industry Software Engineering';

    const timeline = await generateStudyTimeline(
      activeDomain,
      activeTarget,
      failedQuestions || [],
      { correct: correctCount, total: totalAnswered }
    );

    // Save studyRoadmap to user record if user is logged in
    if (req.user) {
      req.user.studyRoadmap = {
        recommendedDays: timeline.recommendedDays,
        recommendedTimeline: timeline.recommendedTimeline,
        retryAfterDate: timeline.retryAfterDate,
        targetedTopics: timeline.targetedTopics,
        studyAdvice: timeline.studyAdvice,
        score: timeline.score,
        totalQuestions: timeline.totalQuestions,
        correctAnswers: timeline.correctAnswers,
        wrongAnswers: timeline.wrongAnswers,
        mandatoryNotice: timeline.mandatoryNotice,
        roadmaps: timeline.roadmaps,
        createdAt: new Date(),
      };
      if (domain) req.user.currentDomain = domain;
      if (targetDomain) req.user.targetDomain = targetDomain;
      await req.user.save();
    }

    await recordAuditLog({
      req,
      action: 'AI_STUDY_TIMELINE_GENERATED',
      entity: 'User',
      entityId: req.user?._id?.toString(),
      details: { domain: activeDomain, score: timeline.score, recommendedTimeline: timeline.recommendedTimeline },
    });

    res.json({ data: timeline });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'TIMELINE_ERROR', message: err.message } });
  }
};

export const getRoadmapsForSkills = async (req: Request, res: Response) => {
  try {
    const skills = req.body.skills || (req.query.skills ? (req.query.skills as string).split(',') : []);
    const degree = (req.query.degree as string) || (req.body.degree as string) || '';
    const roadmaps = await searchRoadmapsForLaggingSkills(skills, degree);
    res.json({ data: roadmaps });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'ROADMAP_ERROR', message: err.message } });
  }
};

export const submitDiagnosticAnswers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const { answers, degree } = req.body;
    const targetDegree = degree || req.user.degree || 'B.Tech Computer Science & Engineering';

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Diagnostic answers are required' } });
    }

    const evaluation = await evaluateDiagnosticAnswers(targetDegree, answers);

    // Save or update in MongoDB SkillProfile
    let profile = await SkillProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = new SkillProfile({
        userId: req.user._id,
        degree: targetDegree,
      });
    }

    profile.overallScore = evaluation.overallScore;
    const totalProfiles = await SkillProfile.countDocuments({ _id: { $ne: profile._id } });
    const lowerProfiles = await SkillProfile.countDocuments({
      _id: { $ne: profile._id },
      overallScore: { $lt: evaluation.overallScore },
    });
    profile.rankPercentile = totalProfiles > 0 ? Math.round((lowerProfiles / totalProfiles) * 100) : evaluation.overallScore;
    profile.skills = evaluation.radar.map((r) => ({
      name: r.subject,
      level: r.score,
      industryBenchmark: r.benchmark,
      verified: true,
      category: 'Diagnostic Assessment',
    }));
    profile.strengths = evaluation.strengths;
    profile.gapAnalysis = evaluation.gaps.map((g) => ({
      skill: g.skill,
      currentLevel: Math.max(1, Math.round((evaluation.overallScore / 100) * 5)),
      requiredLevel: 5,
      gapPercentage: g.gapPercentage,
      priority: g.priority,
    }));
    profile.lastAssessmentDate = new Date().toISOString().split('T')[0];

    await profile.save();

    await recordAuditLog({
      req,
      action: 'AI_DIAGNOSTIC_EVALUATION',
      entity: 'SkillProfile',
      entityId: profile._id.toString(),
      details: { degree: targetDegree, overallScore: evaluation.overallScore },
    });

    res.json({
      data: {
        evaluation,
        profile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'EVALUATION_ERROR', message: err.message } });
  }
};
